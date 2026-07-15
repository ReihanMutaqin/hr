import fs from "fs";
import path from "path";

function walk(dir: string, callback: (filepath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    } else if (filepath.endsWith(".ts")) {
      callback(filepath);
    }
  }
}

function getRelativePath(fromPath: string, toPath: string) {
  let rel = path.relative(path.dirname(fromPath), toPath).replace(/\\/g, "/");
  if (!rel.startsWith(".")) {
    rel = "./" + rel;
  }
  return rel;
}

const dbDir = path.resolve("db");

walk(path.resolve("api"), (filepath) => {
  let content = fs.readFileSync(filepath, "utf-8");
  
  // 1. Replace @db/ imports with relative paths
  content = content.replace(/(from|import)\s+['"]@db\/(.*?)['"]/g, (match, p1, p2) => {
    const targetPath = path.join(dbDir, p2);
    let rel = getRelativePath(filepath, targetPath);
    // Add .js extension
    return `${p1} "${rel}.js"`;
  });

  // 2. Replace relative local imports (./ and ../) without extensions to have .js
  // Must avoid matching .json or .js that already exist.
  content = content.replace(/(from|import)\s+['"](\.\/|\.\.\/)(.*?)['"]/g, (match, p1, prefix, p2) => {
    if (!p2.endsWith(".js") && !p2.endsWith(".json") && !p2.endsWith(".ts")) {
      return `${p1} "${prefix}${p2}.js"`;
    }
    return match;
  });

  fs.writeFileSync(filepath, content);
  console.log(`Updated ${filepath}`);
});
