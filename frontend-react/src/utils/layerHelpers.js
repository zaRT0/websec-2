export function getSourceOfVectorLayerByName(mapObject, layerName) {
    if (!mapObject) return null;

    const layer = mapObject
        .getAllLayers()
        .find(layer => layer.get('name') === layerName);

    if (!layer) return null;

    return layer.getSource();
}

export function getLayerByName(mapObject, layerName) {
    if (!mapObject) return null;

    return mapObject
        .getAllLayers()
        .find(layer => layer.get('name') === layerName) || null;
}