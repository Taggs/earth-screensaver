# Phase 1 Complete: Data Acquisition & Preparation

## Summary

Phase 1 of the globe replacement project has been successfully completed. All Natural Earth data has been downloaded, processed, and converted into optimized formats for offline use.

## What Was Accomplished

### 1. Data Download
- Downloaded Natural Earth 1:10m Physical data (land, ocean)
- Downloaded Natural Earth 1:10m Cultural vectors (countries, populated places)
- Total download size: ~10 MB (compressed)
- Extracted size: 83 MB

### 2. Vector Data Processing
Created two processing scripts:
- **[scripts/process_natural_earth.py](scripts/process_natural_earth.py)**: Converts shapefiles to GeoJSON/JS
- **[scripts/generate_tiles.py](scripts/generate_tiles.py)**: Generates raster map tiles

#### Generated Files:
- **[src/data/countries-ne.geo.json](src/data/countries-ne.geo.json)** (7.3 MB)
  - 258 countries with simplified geometries
  - Properties: name, ISO codes, population, continent, region
  - Optimized for web use with ~0.01° tolerance simplification

- **[src/data/cities-ne.js](src/data/cities-ne.js)** (412 KB)
  - 7,342 cities worldwide
  - 200 capitals + 7,142 other major cities
  - Format: [name, lat, lon, population, isCapital, country]
  - Sorted by population for rendering priority

### 3. Map Tile Generation
Generated **21,845 tiles** across zoom levels 0-7:
- Zoom 0: 1 tile
- Zoom 1: 4 tiles
- Zoom 2: 16 tiles
- Zoom 3: 64 tiles
- Zoom 4: 256 tiles
- Zoom 5: 1,024 tiles
- Zoom 6: 4,096 tiles
- Zoom 7: 16,384 tiles

#### Tile Specifications:
- Size: 256x256 pixels (standard)
- Format: PNG (optimized)
- Color scheme:
  - Ocean: RGB(20, 40, 80) - Dark blue
  - Land: RGB(230, 230, 220) - Light beige
  - Borders: RGB(150, 150, 150) - Gray
- Total size: **90 MB**

### 4. Storage Breakdown

| Component | Size | Location |
|-----------|------|----------|
| Map tiles | 90 MB | [tiles/](tiles/) |
| Countries GeoJSON | 7.3 MB | [src/data/countries-ne.geo.json](src/data/countries-ne.geo.json) |
| Cities data | 412 KB | [src/data/cities-ne.js](src/data/cities-ne.js) |
| Source shapefiles | 83 MB | [data/natural-earth/](data/natural-earth/) |
| **Total** | **~180 MB** | |

Note: Source shapefiles can be deleted after tile generation to save 83 MB.

## Data Quality

### Countries
- All 258 countries from Natural Earth
- Geometries simplified for performance while maintaining accuracy
- Complete metadata (ISO codes, population, region)

### Cities
- Comprehensive global coverage (7,342 cities)
- Includes all 200 country capitals
- Population data for rendering priority
- Latitude/longitude coordinates for all cities

### Map Tiles
- Clean vector-style rendering
- Sufficient detail for small countries (Barbados, Monaco, Vatican) at zoom 7
- Country borders visible from zoom 2+
- Optimized PNG compression

## Scripts Created

1. **[scripts/process_natural_earth.py](scripts/process_natural_earth.py)**
   - Converts countries shapefile to GeoJSON
   - Converts cities shapefile to JavaScript module
   - Simplifies geometries to reduce file size
   - Filters to essential properties only

2. **[scripts/generate_tiles.py](scripts/generate_tiles.py)**
   - Generates raster tiles from Natural Earth vectors
   - Uses PIL (Pillow) for image rendering
   - Clean vector-style color scheme
   - Progress tracking during generation

## Next Steps (Phase 2)

The next phase will:
1. Install three-globe and three.js dependencies
2. Create new globe-threejs.js module
3. Implement custom tile loading from local tiles/ directory
4. Set up basic camera controls and rendering

## Licensing

All data used is from **Natural Earth** (Public Domain):
- Free to distribute
- No attribution required (though appreciated)
- Can be used commercially without restriction

## File Structure

```
earth-screensaver/
├── data/
│   └── natural-earth/          # Source shapefiles (can be deleted)
├── src/
│   └── data/
│       ├── countries-ne.geo.json   # Optimized countries
│       └── cities-ne.js            # Cities array
├── scripts/
│   ├── process_natural_earth.py    # Data conversion
│   └── generate_tiles.py           # Tile generation
└── tiles/                          # Generated map tiles
    ├── 0/, 1/, 2/, ... 7/         # Zoom levels
    └── [z]/[x]/[y].png            # Tile files
```

---

**Phase 1 Status: COMPLETE** ✓

Generated: 2026-01-06
