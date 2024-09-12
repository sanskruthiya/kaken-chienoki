import * as maplibregl from "maplibre-gl";
import * as pmtiles from 'pmtiles';
import MaplibreTerradrawControl from '@watergis/maplibre-gl-terradraw';
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles",protocol.tile);

const init_coord = [6.4, 3.6];
const init_zoom = 4.5;
const init_bearing = 10;
const init_pitch = 0;

const filterPOl = document.getElementById('filterinput');
const listingPOl = document.getElementById('feature-list');
const clearBtn = document.getElementById('clearButton');
const selected_category = document.querySelector('.category-select');
const loadingCount = document.getElementById("loading-count");

const categoryNames = ["全体件数ヒートマップ","東京大学","京都大学","大阪大学","東北大学","九州大学","名古屋大学","北海道大学","筑波大学","広島大学","神戸大学","早稲田大学","慶應義塾大学","東京工業大学"];
const gridNames = ["jenks_all","jenks_P01","jenks_P02","jenks_P03","jenks_P04","jenks_P05","jenks_P06","jenks_P07","jenks_P08","jenks_P09","jenks_P10","jenks_P11","jenks_P12","jenks_P13"];
let target_category = 0;
let filter_id = '';
let grid_id = 'jenks_all';

const categoryLength = categoryNames.length;
for (let i = 0; i < categoryLength; i++) {
    const selectCategory = document.getElementById('category-id');
    const optionName = document.createElement('option');
    optionName.value = categoryNames[i];
    optionName.textContent = categoryNames[i];
    selectCategory.appendChild(optionName);
}

function renderListings(features) {
    const listingBox = document.createElement('p');
    listingPOl.innerHTML = '';

    const existingToggleButton = document.getElementById('toggle-list-button'); //This returns null on the first render.
    if (existingToggleButton) {existingToggleButton.remove();}
    
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '▲ 広げる';
    toggleButton.id = 'toggle-list-button';
    toggleButton.classList.add('toggle-button');
    if (listingPOl.classList.contains('large-screen')) {
        toggleButton.textContent = '▼ 戻す';
    } else {
        toggleButton.textContent = '▲ 広げる';
    }
    
    toggleButton.addEventListener('click', function() {
        listingPOl.classList.toggle('large-screen');
        if (listingPOl.classList.contains('large-screen')) {
            toggleButton.textContent = '▼ 戻す';
        } else {
            toggleButton.textContent = '▲ 広げる';
        }
    });
    listingPOl.insertBefore(toggleButton, listingPOl.firstChild);
    
    if (features.length) {
        listingBox.textContent = 'マップ中央付近の研究サンプル:'+features.length+'件';
        listingPOl.appendChild(listingBox);
        for (const feature of features) {
            const itemLink = document.createElement('a');
            const label = `<strong>${feature.properties.title}</strong> (${feature.properties.affiliation})`;
            itemLink.href = "https://kaken.nii.ac.jp/ja/search/?qb=" + feature.properties.doc_id;
            itemLink.target = '_blank';
            itemLink.innerHTML = label;
            listingPOl.appendChild(itemLink);
            listingPOl.append(document.createElement("hr"));
        }
        filterPOl.parentNode.style.display = 'block';
    } else if (features.length === 0 && filterPOl.value !== "") {
        listingBox.textContent = 'マップ中央付近に表示できるサンプルがありません。';
        listingPOl.appendChild(listingBox);
    } else {
        listingBox.textContent = 'マップ中央付近に表示できるサンプルがありません。';
        listingPOl.appendChild(listingBox);
        filterPOl.parentNode.style.display = 'block';
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
    maplibreLogo: true,
    attributionControl:false
});

const drawControl = new MaplibreTerradrawControl({
    modes: ['point', 'linestring', 'select'],//'polygon', 'rectangle', 'angled-rectangle', 'circle', 'freehand'
    open: false,
});
map.addControl(drawControl, 'top-right');

const attCntl = new maplibregl.AttributionControl({
    customAttribution:'出典：<a href="https://kaken.nii.ac.jp/ja/" target="_blank">KAKEN</a>',
    compact: true
});
map.addControl(attCntl, 'bottom-right');

map.addControl(new maplibregl.NavigationControl({showCompass:false}, 'top-left'));

map.on('load', function () {
    map.addSource('docs', {
        'type': 'vector',
        'url': 'pmtiles://app/data/KAKEN_start202104asof202408.pmtiles',
        "minzoom": 4,
        "maxzoom": 9,
    });

    const gd = {'type': 'FeatureCollection','features': []}
    const doc_paint = {'circle-radius':['interpolate',['linear'],['zoom'],4,1,10,10],'circle-color':['interpolate',['linear'],['zoom'],4,'#abdda4',7,'#ffcedb']};
    
    map.addLayer({
        'id': 'poi_pseudo',
        'type': 'circle',
        'source': 'docs',
        'source-layer': 'docs_202120240901',
        'minzoom': 4,
        'layout': {
            'visibility': 'visible', 
            'circle-sort-key':["to-number", ['get', 'fid']],
        },
        'paint': {
            'circle-color':'transparent',
            'circle-stroke-color':'transparent'
        }
    });
    map.addLayer({
        'id': 'doc_point',
        'type': 'circle',
        'source': 'docs',
        'source-layer': 'docs_202120240901',
        'circle-sort-key':["to-number", ['get', 'total_grant']],
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
        'fill-opacity': ['interpolate',['linear'],['zoom'],5,1,10,0.1]
        }
    });
    
    let fgb_src_gd = map.getSource('doc_grid');
    
    let loadFGB_gd = async (url, updateCount) => {
        const response = await fetch(url);
        let meta, iter = flatgeobuf.deserialize(response.body, null, m => meta = m)
        for await (let feature of iter) {
          gd.features.push(feature)
          loadingCount.textContent = ((gd.features.length / meta.featuresCount) * 100).toFixed(0);
          if (gd.features.length == meta.featuresCount || (gd.features.length % updateCount) == 0) {
            fgb_src_gd.setData(gd);
          }
          if (gd.features.length == meta.featuresCount) {
            setTimeout(function () {
                document.getElementById("titlewindow").style.display = "none";
                map.zoomIn({duration: 1000});
            }, 500);
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
            'text-field': '{label_alias}',
            'text-font': ["NotoSans-SemiBold"],
            'text-size': 13,
            'text-offset': [0, 0],
            'text-anchor': 'top',
            'symbol-sort-key':["to-number", ['get', 'documents']],
            'symbol-z-order': "viewport-y",//"source"
            'text-allow-overlap': true,
            'text-ignore-placement': false
        },
        'paint': {'text-color': '#555','text-halo-color': '#fff','text-halo-width': 1}
    });
    map.addLayer({
        'id':'doc_label',
        'type':'symbol',
        'source':'docs',
        'source-layer': 'docs_202120240901',
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

        target_category = selected_category.selectedIndex;
        filter_id = (target_category === 0 ? '' : categoryNames[target_category]);
        grid_id = gridNames[target_category];

        const uniquePOI = map.queryRenderedFeatures({ layers: ['poi_pseudo'], filter: ['in', filter_id, ["get", "affiliation"]] });
        const extentPOI = map.queryRenderedFeatures(bbox, { layers: ['poi_pseudo'], filter: ['in', filter_id, ["get", "affiliation"]] });
        const filtered_unique = [];
        const filtered_extent = [];

        if (filterPOl.value.length > 0) {
            map.setPaintProperty('doc_grid', 'fill-color', 'transparent');
            map.setPaintProperty('doc_point', 'circle-color', '#ffcedb');
            for (const feature of uniquePOI) {
                if ((feature.properties.title ? feature.properties.title : '').includes(filterPOl.value) || (feature.properties.main_researcher ? feature.properties.main_researcher : '').includes(filterPOl.value)) {
                    filtered_unique.push(feature);
                }
            }
            for (const feature of extentPOI) {
                if ((feature.properties.title ? feature.properties.title : '').includes(filterPOl.value) || (feature.properties.main_researcher ? feature.properties.main_researcher : '').includes(filterPOl.value)) {
                    filtered_extent.push(feature);
                }
            }
            renderListings(filtered_extent);
            if (filtered_unique.length) {
                map.setFilter('doc_point', ['match',['get', 'fid'],filtered_unique.map((feature) => {return feature.properties.fid;}),true,false]);
                map.setFilter('doc_label', ['match',['get', 'fid'],filtered_unique.map((feature) => {return feature.properties.fid;}),true,false]);
            } else {
                //If the result is 0, then it returns no poi.
                map.setFilter('doc_point', ['has', 'poi0']);
                map.setFilter('doc_label', ['has', 'poi0']);
            }
        } else {
            renderListings(extentPOI);
            map.setFilter('doc_point', ['in', filter_id, ["get", "affiliation"]]);
            map.setFilter('doc_label', ['in', filter_id, ["get", "affiliation"]]);
            map.setPaintProperty('doc_point', 'circle-color', ['interpolate',['linear'],['zoom'],4,'#abdda4',7,'#ffcedb']);
            map.setPaintProperty('doc_grid', 'fill-color', ['let','density',['get', grid_id],['interpolate',['linear'],['var', 'density'],0,['to-color', 'transparent'],1,['to-color', '#d5eeb2'],3,['to-color', '#b4dcb4'],5,['to-color', '#ffffbf'],7,['to-color', '#ffcedb'],9,['to-color', '#ea633e']]]);
        }
    }

    map.on('moveend', generateList);
    filterPOl.addEventListener('change', generateList);
    clearBtn.addEventListener('click', generateList); //this is fired right after the onclick event of clearButton
    selected_category.addEventListener('change', generateList);
    
    let popup_tmp = new maplibregl.Popup({closeButton: false, closeOnClick: false, focusAfterOpen: false, anchor:"bottom", offset:[0,-10], className:"t-popup", maxWidth:'275px'});
    
    map.on('click', 'doc_grid', function (e){
        popup_tmp.remove();
        let query_point = map.queryRenderedFeatures(e.point, { layers: ['doc_point']})[0] !== undefined ? map.queryRenderedFeatures(e.point, { layers: ['doc_point']})[0].properties : "no-layer";
        if (query_point !==  "no-layer") {
            let popupContent;
            popupContent = '<p class="tipstyle02">'+query_point['title']+'</p><hr><p class="tipstyle01">'+ (query_point['main_researcher'] !== undefined ? query_point['main_researcher'] : query_point['affiliation']) +'<br>研究種目：'+query_point['research_category']+'<br>実施期間：'+query_point['project_period']+'<br>助成金額：'+(Number(query_point['total_grant'])/1000).toLocaleString()+'千円<hr><a href="https://kaken.nii.ac.jp/ja/search/?qb=' + query_point['doc_id'] + '" target="_blank">詳細を見る（外部リンク）</a></p>';
            new maplibregl.Popup({closeButton:true, focusAfterOpen:false, anchor:"bottom", offset:[0,-5], className:"t-popup", maxWidth:"280px"}).setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
        } else {
            //map.flyTo({center:e.lngLat,zoom:map.getZoom()+1,speed: 0.5,curve: 1,easing(t) {return t;}});
        }
    });
});

document.getElementById('text-fieldset').disabled = false;

document.getElementById('b_location').style.backgroundColor = "#fff";
document.getElementById('b_location').style.color = "#333";

document.getElementById('b_description').style.backgroundColor = "#fff";
document.getElementById('b_description').style.color = "#333";
document.getElementById('description').style.display ="none";

document.getElementById('b_filter').style.backgroundColor = "#fff";
document.getElementById('b_filter').style.color = "#333";
document.getElementById('filterbox').style.display ="none";

//document.getElementById('b_listing').style.backgroundColor = "#2c7fb8";
//document.getElementById('b_listing').style.color = "#fff";
//document.getElementById('feature-list').style.display ="block";

document.getElementById("hide-title-button").addEventListener("click", function () {
    document.getElementById("titlewindow").style.display = "none";
});

document.getElementById('b_filter').addEventListener('click', function () {
    const visibility = document.getElementById('filterbox');
    if (visibility.style.display == 'block') {
        visibility.style.display = 'none';
        this.style.backgroundColor = "#fff";
        this.style.color = "#555"
    }
    else {
        visibility.style.display = 'block';
        this.style.backgroundColor = "#2c7fb8";
        this.style.color = "#fff";
    }
});
/*
document.getElementById('b_listing').addEventListener('click', function () {
    const visibility01 = document.getElementById('feature-list');
    const visibility02 = document.getElementById('icon-center');
    if (visibility01.style.display == 'block') {
        visibility01.style.display = 'none';
        visibility02.style.display = 'none';
        this.style.backgroundColor = "#fff";
        this.style.color = "#555"
    }
    else {
        visibility01.style.display = 'block';
        visibility02.style.display = 'block';
        this.style.backgroundColor = "#2c7fb8";
        this.style.color = "#fff";
    }
});
*/
document.getElementById('b_description').addEventListener('click', function () {
    const visibility = document.getElementById('description');
    if (visibility.style.display == 'block') {
        visibility.style.display = 'none';
        this.style.backgroundColor = "#fff";
        this.style.color = "#555"
    }
    else {
        visibility.style.display = 'block';
        this.style.backgroundColor = "#2c7fb8";
        this.style.color = "#fff";
    }
});

document.getElementById('b_location').addEventListener('click', function () {
    this.setAttribute("disabled", true);
    this.style.backgroundColor = "#2c7fb8";
    this.style.color = "#fff";
    map.flyTo({
        center: init_coord,
        zoom: init_zoom + 1,
    });
    this.style.backgroundColor = "#fff";
    this.style.color = "#333";
    this.removeAttribute("disabled");
});
