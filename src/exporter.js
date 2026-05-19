'use strict';

const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const settings = require('../config/settings');
const logger = require('./logger');

const FIELDS = ['name', 'address', 'phone', 'email', 'website', 'size', 'specialty', 'tested_at'];

function timestampedName(base, ext) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${base}_${ts}.${ext}`;
}

function ensureOutputDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function exportResults(records) {
  const outDir = settings.output.dir;
  ensureOutputDir(outDir);

  const jsonPath = path.join(outDir, timestampedName(settings.output.jsonFilename, 'json'));
  const csvPath = path.join(outDir, timestampedName(settings.output.csvFilename, 'csv'));

  fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2), 'utf8');
  logger.info(`JSON report saved: ${jsonPath} (${records.length} records)`);

  try {
    const parser = new Parser({ fields: FIELDS });
    const csv = parser.parse(records);
    fs.writeFileSync(csvPath, csv, 'utf8');
    logger.info(`CSV report saved: ${csvPath}`);
  } catch (err) {
    logger.error(`CSV export failed: ${err.message}`);
  }

  return { jsonPath, csvPath };
}

module.exports = { exportResults };
