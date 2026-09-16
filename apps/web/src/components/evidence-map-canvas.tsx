"use client";

import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ExpressionSpecification } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { Plus, Minus, Maximize, Compass, LocateFixed } from "lucide-react";
import { Map, MapClusterLayer, MapMarker, MarkerContent, MapPopup, useMap } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { mapNl as t } from "@/lib/nl";
import { mapConfidence, coordinateState, municipality, municipalityBounds, recordAddress, type MapEntry, type MapBounds } from "@/lib/map-data";

type Props = { entries: MapEntry[]; selected: MapEntry | null; onSelect: (entry: MapEntry | null) => void; onBounds: (bounds: MapBounds) => void; fitRequest: number };
const [west, south, east, north] = municipalityBounds;
const initialBounds: [[number, number], [number, number]] = [[west, south], [east, north]];

class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div role="alert" className="grid h-full place-content-center gap-3 p-8 text-center text-sm"><p>{t.webglError}</p><Button variant="outline" onClick={() => this.setState({ failed: false })}>{t.retry}</Button></div> : this.props.children; }
}

// MapLibre accepts RGB colors; the app theme uses OKLCH. Canvas resolves the
// semantic tokens to sRGB instead of duplicating the theme palette in JS.
function themeColor(token: string) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  ctx.fillRect(0, 0, 1, 1);
  const [r,g,b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r},${g},${b})`;
}

function MapContents({ entries, selected, onSelect, onBounds, fitRequest, onRetry }: Props & { onRetry: () => void }) {
  const { map, isLoaded } = useMap();
  const [failed, setFailed] = useState(false);
  const [palette, setPalette] = useState<string[] | null>(null);
  const selectedId = selected?.record.ondernemingsnr;
  const lon = selected?.record.longitude;
  const lat = selected?.record.latitude;
  const validSelection = selected && coordinateState(selected.record) === "valid";
  const features = useMemo<FeatureCollection<Point>>(() => ({ type: "FeatureCollection", features: entries.map(({ record, score }) => ({ type: "Feature", geometry: { type: "Point", coordinates: [record.longitude!, record.latitude!] }, properties: { id: record.ondernemingsnr, confidence: mapConfidence(score) } })) }), [entries]);

  useEffect(() => {
    function updatePalette() { setPalette(["--chart-1", "--warning", "--destructive", "--muted-foreground", "--primary"].map(themeColor)); }
    updatePalette();
    const observer = new MutationObserver(updatePalette); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!map) return;
    const publishBounds = () => { const b = map.getBounds(); onBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]); };
    const handleError = () => setFailed(true);
    map.getCanvas().setAttribute("aria-label", t.mapLabel);
    map.getCanvas().setAttribute("aria-description", t.mapKeyboard);
    map.on("moveend", publishBounds); map.on("error", handleError);
    publishBounds();
    const observer = new ResizeObserver(() => map.resize()); observer.observe(map.getContainer());
    const timeout = window.setTimeout(() => { if (!map.loaded()) setFailed(true); }, 15_000);
    return () => { map.off("moveend", publishBounds); map.off("error", handleError); observer.disconnect(); clearTimeout(timeout); };
  }, [map, onBounds]);

  useEffect(() => {
    if (!map || !isLoaded || !validSelection || lon == null || lat == null) return;
    map.easeTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 17), duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450 });
  }, [map, isLoaded, selectedId, lon, lat, validSelection]);

  useEffect(() => {
    if (!map || !isLoaded || !fitRequest || !entries.length) return;
    const longitudes = entries.map(e => e.record.longitude!); const latitudes = entries.map(e => e.record.latitude!);
    map.fitBounds([[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]], { padding: 65, maxZoom: 17, duration: 0 });
  }, [map, isLoaded, fitRequest, entries]);

  useEffect(() => {
    if (!map || !isLoaded || !palette) return;
    const id = "municipality-check-bounds";
    if (!map.getSource(id)) map.addSource(id, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[west,south], [east,south], [east,north], [west,north], [west,south]] } } });
    if (!map.getLayer(id)) map.addLayer({ id, type: "line", source: id, paint: { "line-color": palette[4], "line-width": 1.5, "line-dasharray": [3,3], "line-opacity": 0.6 } });
    return () => { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); };
  }, [map, isLoaded, palette]);

  const pointColor = useMemo<ExpressionSpecification | undefined>(() => palette ? ["match", ["get", "confidence"], "Hoog", palette[0], "Middel", palette[1], "Laag", palette[2], palette[3]] : undefined, [palette]);
  const clusterColors = useMemo<[string,string,string] | undefined>(() => palette ? [palette[4], palette[4], palette[4]] : undefined, [palette]);
  async function fullscreen() {
    if (!map) return;
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await map.getContainer().requestFullscreen(); } catch { setFailed(true); }
  }
  return <>
    {palette && <MapClusterLayer data={features} pointColor={pointColor} clusterColors={clusterColors} clusterMaxZoom={17} clusterRadius={45} onPointClick={feature => { const entry = entries.find(e => e.record.ondernemingsnr === feature.properties?.id); if (entry) onSelect(entry); }} />}
    {validSelection && lon != null && lat != null && <><MapMarker longitude={lon} latitude={lat}><MarkerContent><span className="block size-6 rounded-full border-[3px] border-primary bg-primary/20 ring-4 ring-background/80" /></MarkerContent></MapMarker><MapPopup longitude={lon} latitude={lat} offset={18} closeButton onClose={() => onSelect(null)}><div className="max-w-56 pr-4"><p className="text-xs font-semibold">{selected.record.commercieleNaam || selected.record.naam || t.noName}</p><p className="mt-1 text-xs text-muted-foreground">{recordAddress(selected.record)}</p></div></MapPopup></>}
    <div className="absolute left-3 top-3 z-10 rounded-lg border bg-card/95 px-3 py-2 shadow-sm"><p className="text-xs font-semibold">{municipality.naam}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{t.bbox}</p></div>
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-xl border bg-card p-1 shadow-sm">
      <Button variant="ghost" size="icon-sm" aria-label={t.zoomIn} title={t.zoomIn} onClick={() => map?.zoomIn({ duration: 0 })}><Plus className="size-4" /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={t.zoomOut} title={t.zoomOut} onClick={() => map?.zoomOut({ duration: 0 })}><Minus className="size-4" /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={t.north} title={t.north} onClick={() => map?.resetNorthPitch({ duration: 0 })}><Compass className="size-4" /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={t.reset} title={t.reset} onClick={() => { onSelect(null); map?.fitBounds(initialBounds, { padding: 35, duration: 0 }); }}><LocateFixed className="size-4" /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={t.fullscreen} title={t.fullscreen} onClick={() => void fullscreen()}><Maximize className="size-4" /></Button>
    </div>
    {failed && <div role="alert" className="absolute inset-x-3 top-24 z-20 rounded-lg border bg-card p-3 text-xs shadow-sm"><p>{t.tileError}</p><Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>{t.retry}</Button></div>}
  </>;
}

export default function EvidenceMapCanvas(props: Props) {
  const [generation, setGeneration] = useState(0);
  return <MapErrorBoundary><Map key={generation} theme="light" bounds={initialBounds} fitBoundsOptions={{ padding: 35 }} minZoom={7} maxZoom={20} attributionControl={{ compact: false }} locale={{ "AttributionControl.ToggleAttribution": t.toggleAttribution, "AttributionControl.MapAttribution": t.mapAttribution, "Map.Title": t.mapLabel }}><MapContents {...props} onRetry={() => setGeneration(n => n + 1)} /></Map></MapErrorBoundary>;
}
