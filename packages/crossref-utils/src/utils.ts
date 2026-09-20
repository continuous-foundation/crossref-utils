import fs from 'node:fs';

export function addDoiToConfig(configFile: string, doi: string) {
  const file = fs.readFileSync(configFile).toString();
  const lines = file.split('\n');
  const projectIndex = lines.findIndex((line) => line.trim() === 'project:');
  const newLines = [
    ...lines.slice(0, projectIndex + 1),
    `  doi: ${doi}`,
    ...lines.slice(projectIndex + 1),
  ];
  fs.writeFileSync(configFile, newLines.join('\n'));
}
