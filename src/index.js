import * as maplibregl from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const init_coord = [7.5, 2.5];
const init_zoom = 4.5;
const init_bearing = 0;
const init_pitch = 0;

const map = new maplibregl.Map({
    container: 'map',
    style: {"version":8,"name":"blank","center":[0,0],"zoom":1,"bearing":0,"pitch":0,"sources":{"plain":{"type":"vector","url":""}},"sprite":"","glyphs":"https://glyphs.geolonia.com/{fontstack}/{range}.pbf","layers":[{"id":"background","type":"background","paint":{"background-color":"#f5fffa"},'text-font':["Noto Sans Regular"]}],"id":"blank"},
    localIdeographFontFamily: ['sans-serif'],
    center: init_coord,
    zoom: init_zoom,
    minZoom: 4,
    maxZoom: 15,
    maxBounds: [[-50.0000, -10.0000],[50.0000, 25.0000]],
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
map.zoomIn({duration: 1000});

const attCntl = new maplibregl.AttributionControl({
    customAttribution: '<p class="remark"><a href="https://kaken.nii.ac.jp/ja/" target="_blank">科学研究費助成事業データベース：KAKEN</a>から取得した2021年度以降に開始または開始予定の研究情報を独自に加工（2022年9月10日時点で取得した約5万7千件が対象）。<br>研究の数が集中しているトピックほど 緑 < 黄 < 赤 の順で色づきます。個々の研究概要は１件＝１点で内容に沿って配置（拡大時のみピンク色の点とキーワードで図示）、クリックで確認可能です。<br>ご意見は作成者（<a href="https://twitter.com/Smille_feuille" target="_blank">Twitter</a> | <a href="https://github.com/sanskruthiya/kaken-chienoki" target="_blank">Github</a>）まで。</p>',
    compact: true
});

map.addControl(attCntl, 'bottom-right');
map.addControl(new maplibregl.NavigationControl({showCompass:false}, 'top-left'));

const categoryNames = ["全ての研究（2021年度以降開始）","基盤研究","若手研究","特別研究員奨励費","挑戦的研究","研究活動スタート支援","学術変革領域研究","奨励研究","新学術領域研究","国際共同研究加速基金","特別推進研究"];
const gridNames = ["jenks_all","jenks_P1","jenks_P2","jenks_P3","jenks_P4","jenks_P5","jenks_P6","jenks_P7","jenks_P8","jenks_P9","jenks_P0"];
let target_category = 0;
let filter_id = '';
let grid_id = 'jenks_all';

map.on('load', function () {
    map.addSource('docs', {
        'type': 'vector',
        'tiles': [location.href+"/app/tile/{z}/{x}/{y}.pbf"],
        "minzoom": 0,
        "maxzoom": 9,
    });

    const gd = {'type': 'FeatureCollection','features': []}
    const doc_paint = {'circle-radius':['interpolate',['linear'],['zoom'],5,1,10,10],'circle-color':['interpolate',['linear'],['zoom'],5,'#abdda4',7,'#ffcedb']};

    map.addLayer({
        'id': 'tree',
        'type': 'fill',
        'source': {'type':'geojson', 'data': './app/tree.geojson'},
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
        'filter': ['in', filter_id, ["get", "research_category"]],
        'minzoom': 5,
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
    loadFGB_gd('./app/grid.fgb', 512);

    map.addLayer({
        'id': 'area_label',
        'type': 'symbol',
        'source': {'type':'geojson', 'data': './app/label.geojson'},
        'maxzoom':9.5,
        'layout': {
            'icon-image': '',
            'visibility': 'visible',
            'text-field': '{label}',
            'text-font': ["Noto Sans Regular"],
            'text-size': 12,
            'text-offset': [0, 0],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-ignore-placement': false
        },
        'paint':{
            'text-color': '#111'
        }
    });
    map.addLayer({
        'id':'doc_label',
        'type':'symbol',
        'source':'docs',
        'source-layer': 'doc',
        'filter': ['in', filter_id, ["get", "research_category"]],
        'minzoom':9.5,
        'layout':{
            'icon-image':'',
            'visibility': 'visible',
            'text-field': '{keyword}',
            'text-font': ["Noto Sans Regular"],
            'text-size': 11,
            'text-offset': [0, 0],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-ignore-placement': false
        },
        'paint':{
            'text-color': '#555'
        }
    });
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
    map.setFilter('doc_label', ['in', filter_id, ["get", "research_category"]]);
    map.setFilter('doc_point', ['in', filter_id, ["get", "research_category"]]);
    map.setPaintProperty('doc_grid', 'fill-color', ['let','density',['get', grid_id],['interpolate',['linear'],['var', 'density'],0,['to-color', 'transparent'],1,['to-color', '#d5eeb2'],3,['to-color', '#b4dcb4'],5,['to-color', '#ffffbf'],7,['to-color', '#ffcedb'],9,['to-color', '#ea633e']]]);
});

let popup_tmp = new maplibregl.Popup({closeButton: false, closeOnClick: false, focusAfterOpen: false, anchor:"bottom", offset:[0,-10], className:"t-popup", maxWidth:'275px'});

map.on('mouseenter', 'doc_point', function (e){
    map.getCanvas().style.cursor = 'pointer';
    let coordinates = e.features[0].geometry.coordinates.slice();
    let description = '<p class="tipstyle01">'+e.features[0].properties.title+'</p>';
    popup_tmp.setLngLat(coordinates).setHTML(description).addTo(map);
});

map.on('mouseleave', 'doc_point', function () {
    map.getCanvas().style.cursor = '';
    popup_tmp.remove();
});

map.on('click', 'doc_grid', function (e){
    popup_tmp.remove();
    let query_point = map.queryRenderedFeatures(e.point, { layers: ['doc_point']})[0] !== undefined ? map.queryRenderedFeatures(e.point, { layers: ['doc_point']})[0].properties : "no-layer";
    let popupContent;
    let zoomSet = map.getZoom() + 1;
    if (query_point !==  "no-layer") {
        //popupContent = '<p class="tipstyle02">'+query_point['title']+'</p><hr><p class="tipstyle01">'+query_point['affiliation']+'<br>助成額：'+(Number(query_point['total_grant'])/1000).toLocaleString()+'千円<br><a href="https://kaken.nii.ac.jp/ja/search/?qb=' + query_point['doc_id'] + '" target="_blank">詳細を見る（外部リンク）</a></p>';
        popupContent = '<p class="tipstyle02">'+query_point['title']+'</p><hr><p class="tipstyle01">'+query_point['affiliation']+'<br><a href="https://kaken.nii.ac.jp/ja/search/?qb=' + query_point['doc_id'] + '" target="_blank">詳細を見る（外部リンク）</a></p>';
        new maplibregl.Popup({closeButton:true, focusAfterOpen:false, anchor:"bottom", offset:[0,-5], className:"t-popup", maxWidth:"280px"})
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map);
    } else if (zoomSet < 9) {
        map.flyTo({center: e.lngLat, zoom: zoomSet, speed: 0.2});
    }
});
