const initSqlJs = require("./node_modules/sql.js/dist/sql-wasm.js");
(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run("CREATE TABLE patients (id TEXT, name TEXT, phone TEXT, deleted INT)");
  db.run("INSERT INTO patients VALUES ('1','Ramesh Kumar','9876543210',0)");
  for (const term of ["9876543210", "1234567890", "Ramesh", "zzz"]) {
    const stmt = db.prepare("SELECT name, phone FROM patients WHERE deleted = 0 AND (phone LIKE ? OR name LIKE ?) ORDER BY name");
    stmt.bind([`%${term}%`, `%${term}%`]);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    console.log(term, "->", JSON.stringify(rows));
  }
})();
