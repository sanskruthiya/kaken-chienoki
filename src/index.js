import * as maplibregl from "maplibre-gl";
import * as pmtiles from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles",protocol.tile);

const init_coord = [6.4, 3.6];
const init_zoom = 4.5;
const init_bearing = 0;
const init_pitch = 0;

const listingPOl = document.getElementById('feature-list');

function renderListings(features) {
    const listingBox = document.createElement('p');
    listingPOl.innerHTML = '';
    
    if (features.length) {
        listingBox.textContent = 'マップ中央付近の研究サンプル '+features.length+'件を表示';
        listingPOl.appendChild(listingBox);
        for (const feature of features) {
            const itemLink = document.createElement('a');
            const label = `${feature.properties.title} (${feature.properties.affiliation})`;
            itemLink.href = "https://kaken.nii.ac.jp/ja/search/?qb=" + feature.properties.doc_id;
            itemLink.target = '_blank';
            itemLink.textContent = label;
            listingPOl.appendChild(itemLink);
            listingPOl.append(document.createElement("br"));
        }
    } else {
        listingBox.textContent = '表示できるサンプルがありません。';
        listingPOl.appendChild(listingBox);
    }
}

const map = new maplibregl.Map({
    container: 'map',
    style: {"version":8,"name":"blank","center":[0,0],"zoom":1,"bearing":0,"pitch":0,"sources":{"plain":{"type":"vector","url":""}},"sprite":"","glyphs":location.href+"app/fonts/{fontstack}/{range}.pbf","layers":[{"id":"background","type":"background","paint":{"background-color":"#f5fffa"}}],"id":"blank"},
    localIdeographFontFamily: ['sans-serif'],
    center: init_coord,
    zoom: init_zoom,
    minZoom: 4,
    maxZoom: 15,
    maxBounds: [[-50.0000, -12.0000],[50.0000, 25.0000]],
    bearing: init_bearing,
    pitch: init_pitch,
    interactive: true,
    dragRotate: false,
    touchPitch: false,
    pitchWithRotate: false,
    doubleClickZoom: false,
    maplibreLogo: false,
    attributionControl:false
});

map.touchZoomRotate.disableRotation();

const attCntl = new maplibregl.AttributionControl({
    customAttribution:'出典：<a href="https://kaken.nii.ac.jp/ja/" target="_blank">KAKEN</a> | <a href="https://github.com/sanskruthiya/kaken-chienoki/" target="_blank">このマップの説明（Github）</a>',
    compact: true
});


map.addControl(attCntl, 'bottom-right');
map.addControl(new maplibregl.NavigationControl({showCompass:false}, 'top-left'));

const categoryNames = ["フィルターなし","東京大学","京都大学","大阪大学","東北大学","九州大学","名古屋大学","北海道大学","筑波大学","広島大学","神戸大学","早稲田大学","慶應義塾大学","東京工業大学","岡山大学"];
const gridNames = ["jenks_all","jenks_P01","jenks_P02","jenks_P03","jenks_P04","jenks_P05","jenks_P06","jenks_P07","jenks_P08","jenks_P09","jenks_P10","jenks_P11","jenks_P12","jenks_P13","jenks_P14"];
let target_category = 0;
let filter_id = '';
let grid_id = 'jenks_all';

map.on('load', function () {
    map.addSource('docs', {
        'type': 'vector',
        'url': 'pmtiles://'+location.href+'app/data/KAKEN_start202104asof202308.pmtiles',
        "minzoom": 0,
        "maxzoom": 8,
    });

    const gd = {'type': 'FeatureCollection','features': []}
    const doc_paint = {'circle-radius':['interpolate',['linear'],['zoom'],4,1,10,10],'circle-color':['interpolate',['linear'],['zoom'],4,'#abdda4',7,'#ffcedb']};

    map.addLayer({
        'id': 'tree',
        'type': 'fill',
        'source': {'type':'geojson', 'data': './app/data/tree.geojson'},
        'maxzoom': 15,
        'layout': {'visibility': 'visible'},
        'paint': {
            'fill-color': 
            [
                'interpolate',
                ['linear'],
                ['zoom'],
                5,'#cd853f',15,'#f5deb3'
            ]
        },
        'fill-opacity': 0.5
    });

    map.addLayer({
        'id': 'doc_point',
        'type': 'circle',
        'source': 'docs',
        'source-layer': 'doc',
        'filter': ['in', filter_id, ["get", "affiliation"]],
        'minzoom': 4,
        'layout': {
            'visibility': 'visible',
        },
       'paint': doc_paint
    });
    
    map.addLayer({
        'id': 'doc_grid',
        'type': 'fill',
        'source': {
            'type':'geojson',
            'data':gd,
        },
        'maxzoom': 15,
        'layout': {
            'visibility': 'visible',
        },
        'paint': {
            'fill-color': [
                'let',
                'density',
                ['get', grid_id],
                [
                    'interpolate',
                    ['linear'],
                    ['var', 'density'],
                    0,
                    ['to-color', 'transparent'], 
                    1,
                    ['to-color', '#d5eeb2'],
                    3,
                    ['to-color', '#b4dcb4'],
                    5,
                    ['to-color', '#ffffbf'],
                    7,
                    ['to-color', '#ffcedb'],
                    9,
                    ['to-color', '#ea633e']
                ]
            ],
        'fill-opacity': ['interpolate',['linear'],['zoom'],5,1,10,0.1],
        }
    });
    
    let fgb_src_gd = map.getSource('doc_grid');
    
    let loadFGB_gd = async (url, updateCount) => {
        const response = await fetch(url);
        let meta, iter = flatgeobuf.deserialize(response.body, null, m => meta = m)
        for await (let feature of iter) {
          gd.features.push(feature)
          if (gd.features.length == meta.featuresCount || (gd.features.length % updateCount) == 0) {
            fgb_src_gd.setData(gd);
          }
        }
      }
    loadFGB_gd('./app/data/grid.fgb', 512);

    map.addLayer({
        'id': 'area_label',
        'type': 'symbol',
        'source': {'type':'geojson', 'data': './app/data/label.geojson'},
        'maxzoom':9.5,
        'layout': {
            'icon-image': '',
            'visibility': 'visible',
            'text-field': '{label}',
            'text-font': ["NotoSans-SemiBold"],
            'text-size': 13,
            'text-offset': [0, 0],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-ignore-placement': false
        },
        'paint': {'text-color': '#555','text-halo-color': '#fff','text-halo-width': 1}
    });
    map.addLayer({
        'id':'doc_label',
        'type':'symbol',
        'source':'docs',
        'source-layer': 'doc',
        'filter': ['in', filter_id, ["get", "affiliation"]],
        'minzoom':9.5,
        'layout':{
            'icon-image':'',
            'visibility': 'visible',
            'text-field': '{keywords}',
            'text-font': ["NotoSans-Regular"],
            'text-size': 11,
            'text-offset': [0, 0],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-ignore-placement': false
        },
        'paint': {'text-color': '#333','text-halo-color': '#fff','text-halo-width': 1}
    });

    function generateList () {
        const center = map.getCenter();
        const point = map.project(center);
        const bbox = [
            [point.x - 20, point.y - 20],
            [point.x + 20, point.y + 20]
        ];
        const extentPOI = map.queryRenderedFeatures(bbox, { layers: ['doc_point'] });
        renderListings(extentPOI);
    } 

    map.on('moveend', generateList);
    map.zoomIn({duration: 1000});
});

const categoryLength = categoryNames.length;
for (let i = 0; i < categoryLength; i++) {
    const selectCategory = document.getElementById('category-id');
    const optionName = document.createElement('option');
    optionName.value = categoryNames[i];
    optionName.textContent = categoryNames[i];
    selectCategory.appendChild(optionName);
}

const selected_category = document.querySelector('.category-select');

selected_category.addEventListener('change', function(){
    target_category = selected_category.selectedIndex;
    filter_id = (target_category === 0 ? '' : categoryNames[target_category]);
    grid_id = gridNames[target_category];
    map.setFilter('doc_label', ['in', filter_id, ["get", "affiliation"]]);
    map.setFilter('doc_point', ['in', filter_id, ["get", "affiliation"]]);
    map.setPaintProperty('doc_grid', 'fill-color', ['let','density',['get', grid_id],['interpolate',['linear'],['var', 'density'],0,['to-color', 'transparent'],1,['to-color', '#d5eeb2'],3,['to-color', '#b4dcb4'],5,['to-color', '#ffffbf'],7,['to-color', '#ffcedb'],9,['to-color', '#ea633e']]]);
});

let popup_tmp = new maplibregl.Popup({closeButton: false, closeOnClick: false, focusAfterOpen: false, anchor:"bottom", offset:[0,-10], className:"t-popup", maxWidth:'275px'});

map.on('mouseenter', 'doc_point', function (e){
    map.getCanvas().style.cursor = 'pointer';
    if (map.getZoom() > 8) {
        let coordinates = e.features[0].geometry.coordinates.slice();
        let description = '<p class="tipstyle01">'+e.features[0].properties.title+'（'+e.features[0].properties.affiliation+'）</p>';
        popup_tmp.setLngLat(coordinates).setHTML(description).addTo(map);
    }
});

map.on('mouseleave', 'doc_point', function () {
    map.getCanvas().style.cursor = '';
    popup_tmp.remove();
});

map.on('click', 'doc_grid', function (e){
    popup_tmp.remove();
    let query_point = map.queryRenderedFeatures(e.point, { layers: ['doc_point']})[0] !== undefined ? map.queryRenderedFeatures(e.point, { layers: ['doc_point']})[0].properties : "no-layer";
    let popupContent;
    if (query_point !==  "no-layer") {
        popupContent = '<p class="tipstyle02">'+query_point['title']+'</p><hr><p class="tipstyle01">'+ (query_point['main_researcher'] !== undefined ? query_point['main_researcher'] : query_point['affiliation']) +'<br><a href="https://kaken.nii.ac.jp/ja/search/?qb=' + query_point['doc_id'] + '" target="_blank">詳細を見る（外部リンク）</a></p>';
        new maplibregl.Popup({closeButton:true, focusAfterOpen:false, anchor:"bottom", offset:[0,-5], className:"t-popup", maxWidth:"280px"}).setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
    }
    map.panTo(e.lngLat,{duration: 1000});
});
