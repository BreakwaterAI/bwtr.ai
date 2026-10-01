import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export function blogPublicFiles(source) {
  const blogRoot = join(source, 'blog');
  if (!existsSync(blogRoot)) return [];
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) files.push(relative(source, file));
    }
  }
  visit(blogRoot);
  const postsPrefix = join('blog', 'posts') + sep;
  return files.filter((file) =>
    !file.startsWith(postsPrefix) &&
    !file.split(sep).some((part) => part.startsWith('.')) &&
    /\.(?:html|css|js|xml|woff2|json|png|gif)$/.test(file)
  ).sort();
}
