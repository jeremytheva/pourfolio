import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { bjcpStyles } from './data/bjcpStyles.js';
import { baStyles } from './data/baStyles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../data/beverage_source.csv');
const outputDir = path.join(__dirname, '../out');

function ensureOutputDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return [];
  }

  const header = parseCSVLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseCSVLine(line);
    return header.reduce((acc, key, index) => {
      acc[key] = cells[index] ?? '';
      return acc;
    }, {});
  });
}

function createDeterministicId(prefix, value) {
  const hash = createHash('sha256').update(value).digest('hex').slice(0, 12);
  return `${prefix}_${hash}`;
}

const styleNameMatchConfig = {
  'American IPA': {
    bjcp: 'bjcp-21a-american-ipa',
    ba: 'ba-american-ipa',
    matchMethod: 'exact-name',
    notes: 'Declared style aligns directly with BJCP 21A American IPA and the Brewers Association American-Style India Pale Ale.'
  },
  'Belgian Witbier': {
    bjcp: 'bjcp-24a-witbier',
    ba: 'ba-wheat-ale',
    matchMethod: 'exact-name',
    notes: 'Declared style maps to the classic Belgian witbier specification in both guideline sets.'
  },
  'Imperial Stout': {
    bjcp: 'bjcp-20c-imperial-stout',
    ba: 'ba-imperial-stout',
    matchMethod: 'exact-name',
    notes: 'Imperial stout terminology is shared between BJCP 20C and the BA American-Style Imperial Stout category.'
  },
  'Kölsch': {
    bjcp: 'bjcp-5b-kolsch',
    ba: 'ba-kolsch',
    matchMethod: 'exact-name',
    notes: 'Kölsch is explicitly covered in BJCP 5B and Brewers Association German-Style Kölsch.'
  },
  'American Amber Ale': {
    bjcp: 'bjcp-19a-american-amber-ale',
    ba: 'ba-american-amber-ale',
    matchMethod: 'exact-name',
    notes: 'American Amber Ale corresponds to BJCP 19A and BA American-Style Amber/Red Ale.'
  }
};

function buildDataModel() {
  const records = parseCsvFile(csvPath);

  const producersBySourceId = new Map();
  const producers = [];

  records.forEach((record) => {
    const sourceId = record['Brewery Id'];
    if (!producersBySourceId.has(sourceId)) {
      const name = record['Brewery Name'];
      const producer = {
        id: createDeterministicId('producer', `${sourceId}|${name}`),
        name,
        slug: slugify(name),
        source_brewery_id: sourceId
      };
      producersBySourceId.set(sourceId, producer);
      producers.push(producer);
    }
  });

  const bjcpLookup = new Map(bjcpStyles.map((style) => [style.id, style]));
  const baLookup = new Map(baStyles.map((style) => [style.id, style]));

  const beverages = records.map((record) => {
    const declaredStyle = record['Declared Style'];
    const mapping = styleNameMatchConfig[declaredStyle];
    const producer = producersBySourceId.get(record['Brewery Id']);
    const beverageIdSeed = `${record['Beer Id']}|${record['Beer Name']}|${producer?.id ?? ''}`;
    const beverageBase = {
      id: createDeterministicId('beverage', beverageIdSeed),
      name: record['Beer Name'],
      slug: slugify(record['Beer Name']),
      beverage_type: 'Beer',
      beverage_subtype: declaredStyle,
      declared_style: declaredStyle,
      producer_id: producer?.id ?? null,
      abv: record.ABV ? Number.parseFloat(record.ABV) : null,
      ibu: record.IBU ? Number.parseInt(record.IBU, 10) : null,
      source_beer_id: record['Beer Id'] || null,
      source_brewery_id: record['Brewery Id'] || null
    };

    const bjcpStyle = mapping?.bjcp ? bjcpLookup.get(mapping.bjcp) : null;
    const baStyle = mapping?.ba ? baLookup.get(mapping.ba) : null;

    return {
      ...beverageBase,
      style_match_status: mapping ? 'matched' : 'unmatched',
      style_match_method: mapping?.matchMethod ?? null,
      bjcp_style_id: mapping?.bjcp ?? null,
      bjcp_style_name: bjcpStyle?.name ?? null,
      ba_style_id: mapping?.ba ?? null,
      ba_style_name: baStyle?.name ?? null
    };
  });

  return { producers, beverages, styleNameMatchConfig };
}

function buildBeverageSeed(beverages) {
  return beverages.map(({
    id,
    name,
    slug,
    beverage_type,
    beverage_subtype,
    declared_style,
    producer_id,
    abv,
    ibu,
    source_beer_id,
    source_brewery_id,
    style_match_status
  }) => ({
    id,
    name,
    slug,
    beverage_type,
    beverage_subtype,
    declared_style,
    producer_id,
    abv,
    ibu,
    source_beer_id,
    source_brewery_id,
    style_match_status
  }));
}

function buildBeveragesWithStyle(beverages) {
  return beverages.map((beverage) => ({
    ...beverage,
    style_match_confidence: beverage.style_match_status === 'matched' ? 'exact' : 'unmatched'
  }));
}

function buildStyleNameMap(config) {
  return Object.entries(config).map(([declaredStyle, mapping]) => ({
    declared_style: declaredStyle,
    bjcp_style_id: mapping.bjcp ?? null,
    ba_style_id: mapping.ba ?? null,
    match_method: mapping.matchMethod ?? null,
    notes: mapping.notes ?? null
  }));
}

function writeJsonFile(fileName, data) {
  const targetPath = path.join(outputDir, fileName);
  fs.writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return targetPath;
}

function main() {
  ensureOutputDir(outputDir);

  const { producers, beverages, styleNameMatchConfig } = buildDataModel();
  const beveragesSeed = buildBeverageSeed(beverages);
  const beveragesWithStyle = buildBeveragesWithStyle(beverages);
  const styleNameMap = buildStyleNameMap(styleNameMatchConfig);

  const outputs = [
    writeJsonFile('producers.json', producers),
    writeJsonFile('beverages_seed.json', beveragesSeed),
    writeJsonFile('beverage_styles_bjcp.json', bjcpStyles),
    writeJsonFile('beverage_styles_ba.json', baStyles),
    writeJsonFile('beverages_with_style.json', beveragesWithStyle),
    writeJsonFile('style_name_map.json', styleNameMap)
  ];

  console.log('Generated files:');
  outputs.forEach((filePath) => {
    console.log(` - ${path.relative(path.join(__dirname, '..'), filePath)}`);
  });
}

main();
