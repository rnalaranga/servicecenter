const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Change provider
schema = schema.replace(/provider\s*=\s*"mysql"/, 'provider = "sqlite"');
schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url      = "file:./dev.db"');

// Extract all enum names and their default values
const enumRegex = /enum\s+(\w+)\s*{([^}]+)}/g;
let match;
const enums = [];

while ((match = enumRegex.exec(schema)) !== null) {
  enums.push(match[1]);
}

// Remove enum definitions
schema = schema.replace(/enum\s+\w+\s*{[^}]+}/g, '');

// Replace enum usages in models with String
enums.forEach(e => {
  // Replace references like `role UserRole @default(VIEWER)` with `role String @default("VIEWER")`
  // We need a regex that matches the enum name as a type.
  const typeRegex = new RegExp(`(\\w+)\\s+${e}(\\?)?(\\s+@default\\(([^)]+)\\))?`, 'g');
  schema = schema.replace(typeRegex, (m, fieldName, optional, defBlock, defValue) => {
    let res = `${fieldName} String${optional ? '?' : ''}`;
    if (defValue) {
      res += ` @default("${defValue}")`;
    }
    return res;
  });
});

// SQLite doesn't support @db.VarChar, @db.Text, @db.Decimal
schema = schema.replace(/@db\.\w+(\([^)]+\))?/g, '');

fs.writeFileSync(schemaPath, schema);
console.log('Schema converted to SQLite!');
