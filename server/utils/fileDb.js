const fs = require('fs').promises;
const path = require('path');

const BD_PATH = path.join(__dirname, '../bdplana');

// Leer archivo JSON
async function readJSON(filename) {
  try {
    const filePath = path.join(BD_PATH, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Si el archivo no existe, crearlo con array vacío
      await writeJSON(filename, []);
      return [];
    }
    throw error;
  }
}

// Escribir archivo JSON de forma atómica
async function writeJSON(filename, data) {
  const filePath = path.join(BD_PATH, filename);
  const tempPath = `${filePath}.tmp`;
  
  try {
    // Asegurar que la carpeta existe
    await fs.mkdir(BD_PATH, { recursive: true });
    
    // Escribir a archivo temporal primero
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
    
    // Renombrar archivo temporal al final (operación atómica)
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Limpiar archivo temporal si hay error
    try {
      await fs.unlink(tempPath);
    } catch {}
    throw error;
  }
}

// Obtener siguiente ID
async function getNextId(filename) {
  const items = await readJSON(filename);
  if (items.length === 0) return 1;
  return Math.max(...items.map(item => item.id)) + 1;
}

module.exports = {
  readJSON,
  writeJSON,
  getNextId
};
