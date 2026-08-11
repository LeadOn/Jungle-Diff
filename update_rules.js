import fs from 'fs';

const files = [
  '.cursorrules',
  '.windsurfrules',
  'CLAUDE.md',
  '.github/copilot-instructions.md',
  '.agents/AGENTS.md'
];

const newState = `- Project is scaffolded and successfully building.
- Custom Dark/Light Design System implemented with CSS variables.
- Homepage fully redesigned (Hero, Ladder, Recent Games) to match a sober, analytical gaming interface.
- Keycloak authentication flow is wired.
- API client layers for GameOn API and Riot CDNs are implemented.
- Base pages set up with mock placeholders for remaining match history integration.
- LoL patches integration with Riot Data Dragon via SSR-friendly Pinia store and ddragon utils.`;

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace the block after "# Current Project State" or "## Current Project State"
    // We will use regex to find the section and replace it.
    
    content = content.replace(
      /((?:#|##)\s+Current Project State\n)([\s\S]*?)(?=\n(?:#|##)\s+IMPORTANT META-RULE|\n$)/,
      `$1${newState}\n`
    );
    
    // For AGENTS.md, it's at the end of the file.
    if (file === '.agents/AGENTS.md') {
       content = content.replace(
         /(## Current Project State\n)[\s\S]*$/,
         `$1${newState}\n`
       );
    }
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
