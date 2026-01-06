#!/usr/bin/env python
"""
Generate map tiles from Natural Earth data for offline use.
Creates a clean vector-style map with land/ocean coloring.
"""

import json
import math
import os
import sys
from pathlib import Path

try:
    import geopandas as gpd
    from PIL import Image, ImageDraw
    from shapely.geometry import box
except ImportError:
    print("ERROR: Required packages not installed. Run:")
    print("  pip install geopandas pillow shapely")
    sys.exit(1)

# Configuration
BASE_DIR = Path(__file__).parent.parent
NE_DIR = BASE_DIR / "data" / "natural-earth"
TILES_DIR = BASE_DIR / "tiles"

# Color scheme (clean vector style)
OCEAN_COLOR = (20, 40, 80)  # Dark blue
LAND_COLOR = (230, 230, 220)  # Light beige
BORDER_COLOR = (150, 150, 150)  # Gray

# Tile settings
TILE_SIZE = 256  # Standard tile size
MIN_ZOOM = 0
MAX_ZOOM = 7

def deg2num(lat, lon, zoom):
    """Convert lat/lon to tile numbers."""
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    xtile = int((lon + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

def num2deg(xtile, ytile, zoom):
    """Convert tile numbers to lat/lon bounds."""
    n = 2.0 ** zoom
    lon_left = xtile / n * 360.0 - 180.0
    lon_right = (xtile + 1) / n * 360.0 - 180.0
    lat_top_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_bottom_rad = math.atan(math.sinh(math.pi * (1 - 2 * (ytile + 1) / n)))
    lat_top = math.degrees(lat_top_rad)
    lat_bottom = math.degrees(lat_bottom_rad)
    return (lon_left, lat_bottom, lon_right, lat_top)

def create_tile(land_gdf, ocean_gdf, countries_gdf, zoom, x, y):
    """Create a single tile image."""
    # Get tile bounds
    lon_min, lat_min, lon_max, lat_max = num2deg(x, y, zoom)
    tile_bounds = box(lon_min, lat_min, lon_max, lat_max)

    # Create image
    img = Image.new('RGB', (TILE_SIZE, TILE_SIZE), OCEAN_COLOR)
    draw = ImageDraw.Draw(img)

    # Helper function to convert lon/lat to pixel coordinates
    def lonlat_to_pixel(lon, lat):
        px = int((lon - lon_min) / (lon_max - lon_min) * TILE_SIZE)
        py = int((lat_max - lat) / (lat_max - lat_min) * TILE_SIZE)
        return (px, py)

    # Draw land
    try:
        land_in_tile = land_gdf[land_gdf.intersects(tile_bounds)]
        for idx, row in land_in_tile.iterrows():
            geom = row.geometry.intersection(tile_bounds)
            if geom.is_empty:
                continue

            # Draw polygon(s)
            if geom.geom_type == 'Polygon':
                coords = [(lonlat_to_pixel(x, y)) for x, y in geom.exterior.coords]
                if len(coords) >= 3:
                    draw.polygon(coords, fill=LAND_COLOR)
            elif geom.geom_type == 'MultiPolygon':
                for poly in geom.geoms:
                    coords = [(lonlat_to_pixel(x, y)) for x, y in poly.exterior.coords]
                    if len(coords) >= 3:
                        draw.polygon(coords, fill=LAND_COLOR)
    except Exception as e:
        pass  # Continue if land rendering fails for this tile

    # Draw country borders (only at higher zoom levels)
    if zoom >= 2:
        try:
            countries_in_tile = countries_gdf[countries_gdf.intersects(tile_bounds)]
            for idx, row in countries_in_tile.iterrows():
                geom = row.geometry.intersection(tile_bounds)
                if geom.is_empty:
                    continue

                # Draw border
                if geom.geom_type == 'Polygon':
                    coords = [(lonlat_to_pixel(x, y)) for x, y in geom.exterior.coords]
                    if len(coords) >= 2:
                        draw.line(coords, fill=BORDER_COLOR, width=1)
                elif geom.geom_type == 'MultiPolygon':
                    for poly in geom.geoms:
                        coords = [(lonlat_to_pixel(x, y)) for x, y in poly.exterior.coords]
                        if len(coords) >= 2:
                            draw.line(coords, fill=BORDER_COLOR, width=1)
        except Exception as e:
            pass  # Continue if border rendering fails

    return img

def generate_tiles():
    """Generate all tiles for zoom levels 0-7."""
    print("=" * 60)
    print("Map Tile Generator")
    print("=" * 60)
    print(f"Zoom levels: {MIN_ZOOM} to {MAX_ZOOM}")
    print(f"Tile size: {TILE_SIZE}x{TILE_SIZE} pixels")
    print(f"Color scheme: Ocean={OCEAN_COLOR}, Land={LAND_COLOR}")
    print()

    # Load Natural Earth data
    print("Loading Natural Earth data...")
    land_path = NE_DIR / "ne_10m_land.shp"
    ocean_path = NE_DIR / "ne_10m_ocean.shp"
    countries_path = NE_DIR / "ne_10m_admin_0_countries.shp"

    if not land_path.exists():
        print(f"ERROR: Land shapefile not found: {land_path}")
        print("Please run download script first.")
        sys.exit(1)

    land_gdf = gpd.read_file(land_path)
    ocean_gdf = gpd.read_file(ocean_path) if ocean_path.exists() else None
    countries_gdf = gpd.read_file(countries_path)

    print(f"  Loaded {len(land_gdf)} land features")
    print(f"  Loaded {len(countries_gdf)} countries")
    print()

    # Generate tiles
    total_tiles = 0
    for zoom in range(MIN_ZOOM, MAX_ZOOM + 1):
        n_tiles = 2 ** zoom
        zoom_dir = TILES_DIR / str(zoom)

        print(f"Generating zoom level {zoom} ({n_tiles}x{n_tiles} = {n_tiles*n_tiles} tiles)...")

        tiles_created = 0
        for x in range(n_tiles):
            x_dir = zoom_dir / str(x)
            x_dir.mkdir(parents=True, exist_ok=True)

            for y in range(n_tiles):
                tile_path = x_dir / f"{y}.png"

                # Create tile
                img = create_tile(land_gdf, ocean_gdf, countries_gdf, zoom, x, y)
                img.save(tile_path, 'PNG', optimize=True)

                tiles_created += 1
                total_tiles += 1

                # Progress indicator
                if tiles_created % 10 == 0:
                    print(f"  Progress: {tiles_created}/{n_tiles*n_tiles}", end='\r')

        print(f"  [OK] Created {tiles_created} tiles for zoom {zoom}                    ")

    print()
    print("=" * 60)
    print(f"[SUCCESS] Generated {total_tiles} tiles total")
    print("=" * 60)

    # Calculate total size
    total_size = sum(f.stat().st_size for f in TILES_DIR.rglob('*.png'))
    total_size_mb = total_size / (1024 * 1024)
    print(f"\nTotal size: {total_size_mb:.2f} MB")
    print(f"Location: {TILES_DIR}")

def main():
    """Main entry point."""
    try:
        generate_tiles()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
