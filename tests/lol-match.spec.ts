import {expect, test} from "@playwright/test";
import type {APIRequestContext} from "@playwright/test";

/**
 * Integration checks against **live** GameOn data.
 *
 * The previous version of this file could never pass: it had no Playwright config to run under, hit
 * a hardcoded `localhost:3000`, used an invented match id, and asserted on selectors that do not
 * exist (`role=tab[name="Détails"]` is not valid Playwright syntax, and the tab is called "Vue
 * d'ensemble"). It is rewritten here to derive its fixtures from the API at run time and to skip
 * itself — rather than fail — when no real API is configured, so the suite is runnable with no
 * credentials at all.
 */

const requiresLiveApi = !process.env.NUXT_PUBLIC_GAME_ON_API_URL;

interface CrewPlayer {
  id: number;
  nickname: string;
}

/**
 * Picks a match that is guaranteed to contain a crew member.
 *
 * `/lol/match/last` returns games where most participants have a null `playerId` — they are not
 * tracked players — so building `/game/<id>/<playerId>` from it produces a malformed URL. Starting
 * from a known player and asking for *their* matches always yields a valid pair.
 */
async function crewMatch(
  request: APIRequestContext,
): Promise<{matchId: string; playerId: number} | null> {
  const playersResponse = await request.get(
    "/api/gameon/lol/summoner?archived=false",
  );
  if (!playersResponse.ok()) return null;

  const players = (await playersResponse.json()) as CrewPlayer[];

  for (const player of players.slice(0, 5)) {
    const matches = await request.get(
      `/api/gameon/lol/match/player/${player.id}?page=1&size=1&rankedOnly=false`,
    );
    if (!matches.ok()) continue;

    const body = (await matches.json()) as {results?: {matchId: string}[]};
    const matchId = body.results?.[0]?.matchId;
    if (matchId) return {matchId, playerId: player.id};
  }

  return null;
}

async function firstCrewPlayer(
  request: APIRequestContext,
): Promise<CrewPlayer | null> {
  const response = await request.get("/api/gameon/lol/summoner?archived=false");
  if (!response.ok()) return null;

  const players = (await response.json()) as CrewPlayer[];
  return players[0] ?? null;
}

test.describe("match detail page", () => {
  test.skip(requiresLiveApi, "NUXT_PUBLIC_GAME_ON_API_URL is not set");

  test("renders a real match with both teams and its tabs", async ({
    page,
    request,
  }) => {
    const match = await crewMatch(request);
    test.skip(!match, "the API returned no crew match to exercise");

    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const response = await page.goto(
      `/game/${match!.matchId}/${match!.playerId}`,
    );
    expect(response?.status()).toBe(200);

    // `exact` matters: key-moment captions contain phrases like "Pris par Teemo — l'équipe bleue",
    // which a loose text match picks up and trips Playwright's strict mode on.
    await expect(page.getByText("Équipe bleue", {exact: true})).toBeVisible();
    await expect(page.getByText("Équipe rouge", {exact: true})).toBeVisible();

    // The tabs are <button role="tab">, so the accessible role is `tab`, not `button`.
    const tablist = page.getByRole("tablist");
    // rAImmus is only offered because the route carries a crew `playerId`; the coach keys its
    // report on that id and answers 404 for anyone the API does not track.
    for (const tab of [
      "Vue d'ensemble",
      "Film de la partie",
      "Performance",
      "rAImmus",
      "Données brutes",
    ]) {
      await expect(tablist.getByRole("tab", {name: tab})).toBeVisible();
    }

    // Hydration mismatches and blocked inline scripts both surface here, and both silently break
    // interactivity while the page still looks correct in a screenshot.
    expect(consoleErrors).toEqual([]);
  });

  /**
   * The coach no longer generates during the request: the API queues the work and both routes
   * answer immediately, so the front end has to read a `202` as a state of its own and poll until
   * the report lands. Only the coach routes are stubbed — the page around them still renders from
   * live data, which is what makes this an integration check rather than a unit test.
   */
  test("shows the queue position, then swaps it for the report", async ({
    page,
    request,
  }) => {
    const match = await crewMatch(request);
    test.skip(!match, "the API returned no crew match to exercise");

    const queued = {
      matchId: match!.matchId,
      playerId: match!.playerId,
      position: 3,
      queueLength: 4,
      estimatedWaitSeconds: 120,
      enqueuedOn: new Date().toISOString(),
    };

    const report = {
      matchId: match!.matchId,
      playerId: match!.playerId,
      analysis: {
        synthese: "Synthèse de test rAImmus.",
        pointsForts: ["Point fort de test"],
        axesProgression: [
          {
            titre: "Axe de test",
            explication: "Explication de test.",
            actionConcrete: "Action de test.",
          },
        ],
        noteSur10: 7.5,
      },
      modelName: "test-model",
      generatedOn: new Date().toISOString(),
    };

    // First read is still queued, every one after it carries the report: that is exactly the
    // transition the polling loop exists for.
    let reads = 0;
    await page.route("**/api/gameon/lol/coach/**", async (route) => {
      reads += 1;
      await route.fulfill(
        reads === 1
          ? {status: 202, json: queued}
          : {status: 200, json: report},
      );
    });

    await page.goto(`/game/${match!.matchId}/${match!.playerId}`);

    // The component is mounted by the tab, not by the page: the coach GET is client-side only.
    await page
      .getByRole("tablist")
      .getByRole("tab", {name: "rAImmus"})
      .click();

    await expect(page.getByText("3ᵉ dans la file.")).toBeVisible();
    await expect(page.getByText("Encore ~2 min")).toBeVisible();

    // The poll runs every 5 s, so allow for one tick plus the round trip.
    await expect(page.getByText("Synthèse de test rAImmus.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("3ᵉ dans la file.")).toBeHidden();
    expect(reads).toBeGreaterThan(1);
  });

  test("an unknown match id yields a real 404", async ({page}) => {
    // The GameOn API answers 204 No Content for an unknown id, which reaches the page as a
    // successful call carrying nothing — it has to be translated into a 404 explicitly.
    const response = await page.goto("/game/EUW1_0000000000/1");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", {name: "Page introuvable"}),
    ).toBeVisible();
  });
});

test.describe("summoner profile", () => {
  test.skip(requiresLiveApi, "NUXT_PUBLIC_GAME_ON_API_URL is not set");

  test("is server-rendered, so crawlers receive the player name", async ({
    page,
    request,
  }) => {
    const player = await firstCrewPlayer(request);
    test.skip(!player, "no players to exercise");

    const response = await page.goto(`/summoner/${player!.id}`);
    expect(response?.status()).toBe(200);

    // Asserting on the served HTML rather than the hydrated DOM: the page used to be client-only,
    // so this is precisely the regression worth guarding.
    const html = await response!.text();
    expect(html).toContain(player!.nickname);
    await expect(page).toHaveTitle(
      new RegExp(player!.nickname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  });
});
