// Prototype EJ App using OpenLayers client backed by GeoServer WMS/WFS.
//
// Author: Ben Krepp (bkrepp@ctps.org)

// URLs for MassGIS basemap layer services
var mgis_serviceUrls = { 
    'topo_features'     :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Topographic_Features_for_Basemap/MapServer",
    'basemap_features'  :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Basemap_Detailed_Features/MapServer",
    'structures'        :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Structures/MapServer",
    'parcels'           :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Level3_Parcels/MapServer"
};

// OpenLayers layers for MassGIS basemap layers used in our map
var mgis_basemap_layers = { 'topo_features'     : null,     // bottom layer
                                         'structures'        : null,     
                                         'basemap_features'  : null,     // on top of 'structures' so labels aren't obscured
                                         'parcels'           : null      // unused; not populated
};


// Varioius things for accessing all CTPS-hosted WMS and WFS layers
// First, folderol to allow the app to run on appsrvr3 as well as "in the wild"
var szServerRoot = location.protocol + '//' + location.hostname;
var nameSpace;
if (location.hostname.includes('appsrvr3')) {   
    szServerRoot += ':8080/geoserver/';  
	nameSpace = 'ctps_pg';
} else {
    szServerRoot += '/maploc/';
	nameSpace = 'postgis'; 
}
var szWMSserverRoot = szServerRoot + '/wms'; 
var szWFSserverRoot = szServerRoot + '/wfs'; 
// CTPS-hosted sample TAZ demographics layer, SRS = EPSG:3857
var demographics_layer = nameSpace + ':' + 'ctps_sample_taz_demographics_epsg3857';


// Vector layer for sketching spatial query polygon
var vectorDrawingSource = new ol.source.Vector({wrapX: false});
var vectorDrawingLayer = new ol.layer.Vector({ source:  vectorDrawingSource });


// Max map resolution at which to label TAZ vector features.
var maxResolutionForLabelingVectorFeatures = 1200;   
// Our function to return text to label TAZ vector features
//
// Unabashedly borrowed from https://openlayers.org/en/latest/examples/vector-labels.html,
// and subsequently morphed for our purposes.
//
var getText = function(feature, resolution) {
  var maxResolution = maxResolutionForLabelingVectorFeatures;
  var text = "TAZ " + String(feature.get('taz'));
  if (resolution > maxResolution) {
    text = '';
  }
  return text;
};
// Our createTextStyle function for labeling the TAZ vector layer
//
// Unabashedly borrowed from https://openlayers.org/en/latest/examples/vector-labels.html,
// and subsequently morphed for our purposes.
//
var createTextStyle = function(feature, resolution) {
  var align = 'center';
  var baseline = 'middle';
  var size = '14px';
  var height = 1;
  var offsetX = 0;
  var offsetY = 0;
  var weight = 'normal';
  var placement = 'point';
  var maxAngle = 45;
  var overflow = 'true'; 
  var rotation = 0;
  var font = weight + ' ' + size + '/' + height + ' ' + 'Arial';
  var fillColor = 'black';      // Color of label TEXT itself
  var outlineColor = 'white';   // Color of label OUTLINE
  var outlineWidth = 0;

  return new ol.style.Text({
    textAlign: align,
    textBaseline: baseline,
    font: font,
    text: getText(feature, resolution),
    fill: new ol.style.Fill({color: fillColor}),
    stroke: new ol.style.Stroke({color: outlineColor, width: outlineWidth}),
    offsetX: offsetX,
    offsetY: offsetY,
    placement: placement,
    maxAngle: maxAngle,
    overflow: overflow,
    rotation: rotation
  });
};

// Vector layer for rendering TAZes
// Needs to be visible to initialize() and renderTazData() functions:
var oTazLayer = new ol.layer.Vector({source: new ol.source.Vector({ wrapX: false }) });
// Define style for the TAZ vector layer, and set that layers's style to it
function myTazLayerStyle(feature, resolution) {
	return new ol.style.Style({ fill	: new ol.style.Fill({ color: 'rgba(193,66,66,0.4)' }), 
                                          stroke : new ol.style.Stroke({ color: 'rgba(0,0,255,1.0)', width: 3.0}),
                                          text:   createTextStyle(feature, resolution)
				});
}
oTazLayer.setStyle(myTazLayerStyle);


// Machinery to support "sketch" functionality
//
var sketching = false;
var draw;
function addInteraction() {
    draw = new ol.interaction.Draw({ source: vectorDrawingSource, type: 'Polygon'  });
    draw.on('drawend', function (e) {
        console.log('Edit sketch complete.');
        var currentFeature= e.feature;
        var geometry = currentFeature.getGeometry();
        executeSpatialQuery(geometry);  
        // Clear the sektched feature from the vector drawing layer:
        // We don't want this rendered on the map after sketching has completed
        var src = vectorDrawingLayer.getSource();
        src.clear();
        // Remove the interaction after the sketch has completed
        ol_map.removeInteraction(draw);    
        sketching = false;        
    });
    ol_map.addInteraction(draw);
} // addInteraction()
//
// Event handler for "sketch" button - this is armed in the initialize() function
//
function sketchHandler(e) {
    var _DEBUG_HOOK = 0;
    if (sketching === false) {
        addInteraction();
        sketching = true;
    } else {
        // Should not get here - but just in case
       sketching = false;   
       return;        
    }
} // sketchHandler()


// Event handler for "clear TAZes" button
// Clears vector layer of selected TAZes from map and clears output div.
function clearTazLayer(e) {
 	var vSource = oTazLayer.getSource();
    vSource.clear();  
    $('#output_div').html('');
} // clearTazLayer()

// Render the TAZes and data about them passed in the array aFeatures,
// first clearing any previously rendered about TAZ features from the map and the output div.
//
function renderTazData(aFeatures) {
    var s, i;
    
    // First, the tabular data
    $('#output_div').html('');
	s = '';
    for (i = 0; i < aFeatures.length; i++) {
        props = aFeatures[i].getProperties();
        s += 'TAZ ' + props.taz + ' 2010 population = ' + props.total_pop_2010 + ' 2016 population = ' + props.total_pop_2016 + '.' + '</br>' ;
    }
    $('#output_div').html(s); 
    
    // Second, the spatial data
    // *** Duplicated code here, I know. Done this way for simplicity during development.
    // *** To be re-factored, when time permits.
    //
    // Get the source for the TAZ vector layer
	var vSource = oTazLayer.getSource();
	// Clear anything that might previously be in the vector layer
    vSource.clear();
    for (i = 0; i < aFeatures.length; i++) {
        vSource.addFeature(aFeatures[i]);
    }
    // Set the source of the vector layer to the data accumulated in the loop
	oTazLayer.setSource(vSource);
    
    // Pan/zoom map to the extent of the selected TAZes
    var extent = oTazLayer.getSource().getExtent();
    ol_map.getView().fit(extent, ol_map.getSize());
} // renderTazData()


// Execute purely tabular SQL query code
function executeTabularQuery(whereClause) {
    //
    // Submit WFS request via AJAX
    var cqlFilter = whereClause;  
	var szUrl = szWFSserverRoot + '?';
    szUrl += '&service=wfs';
    szUrl += '&version=1.0.0';
    szUrl += '&request=getfeature';
    szUrl += '&typename='+demographics_layer;
    szUrl += '&outputformat=json';
    szUrl += '&cql_filter=' + cqlFilter;
    // DEBUG
    // console.log(szUrl);
        
    $.ajax({ url		: szUrl,
         type		: 'GET',
         dataType	: 'json',
         success	: 	function (data, textStatus, jqXHR) {	
                                var reader, aFeatures = [], props = {}, i, s;
                                reader = new ol.format.GeoJSON();
                                aFeatures = reader.readFeatures(jqXHR.responseText);
                                if (aFeatures.length === 0) {
                                    alert('WFS request to get data from tabular query returned no features.');
                                    return;
                                }
                                var _DEBUG_HOOK = 0;
                                renderTazData(aFeatures);
                            },
        error       :   function (qXHR, textStatus, errorThrown ) {
                            alert('WFS request to get data from tabular query failed.\n' +
                                    'Status: ' + textStatus + '\n' +
                                    'Error:  ' + errorThrown);
                        } // error handler for WFS request
    });
} // executeTabularQuery()

// Execute spatial BBOX query
// This function is no longer used, but has been retained for reference by newbies.
function executeBboxlQuery(geometry) {
    console.log('Entered executeBboxQuery.');

    var bbox = geometry.getExtent();
    // The following code is just to make things explicit for newcomers:
    var minx = bbox[0];
    var miny = bbox[1];
    var maxx = bbox[2];
    var maxy = bbox[3];

    // Construct CQL "BBOX" filter to use in WFS request
    // Note: The first parameter of the BBOX filer is the attribute containing the geographic data in the layer being queried.
    var cqlFilter = "BBOX(shape," + minx + "," + miny + "," + maxx + "," + maxy + ")";
    var szUrl = szWFSserverRoot + '?';
    szUrl += '&service=wfs';
    szUrl += '&version=1.0.0';
    szUrl += '&request=getfeature';
    szUrl += '&typename='+demographics_layer;
	szUrl += '&srsname=EPSG:3857';  // NOTE: We reproject the native geometry of the feature to the SRS of the web map.
    szUrl += '&outputformat=json';
    szUrl += '&cql_filter=' + cqlFilter;    
     // DEBUG
    // console.log(szUrl);
        
    $.ajax({ url		: szUrl,
         type		: 'GET',
         dataType	: 'json',
         success	: 	function (data, textStatus, jqXHR) {	
                                var reader, aFeatures = [], props = {}, i, s;
                                reader = new ol.format.GeoJSON();
                                aFeatures = reader.readFeatures(jqXHR.responseText);
                                if (aFeatures.length === 0) {
                                    alert('WFS request to get data from BBOX query returned no features.');
                                    return;
                                }
                                var _DEBUG_HOOK = 0;
                                renderTazData(aFeatures);
                            },
        error       :   function (qXHR, textStatus, errorThrown ) {
                            alert('WFS request to get data from BBOX query failed.\n' +
                                    'Status: ' + textStatus + '\n' +
                                    'Error:  ' + errorThrown);
                        } // error handler for WFS request
    });   
} //executeBboxQuery()


// Execute spatial intersects query
function executeSpatialQuery(geometry) {
    var cqlFilter, lrCount, wkt4poly, aCoords, i, tmp1, tmp2;
    
    console.log('Entered executeSpatialQuery.');
    var _DEBUG_HOOK = 0;

    // Construct CQL "INTERSECTS" filter to use in WFS request
    // Note: The first parameter of the FILETER filer is the attribute containing the geographic data in the layer being queried.
    cqlFilter = "INTERSECTS(shape,"
    
    // Here, we construct a string containing the WKT format for the geometry of the polygon sketched by the user.
    // Assumptions: (1) The feature sketched is a simple polygon, rather than a multipart polygon
    //                    (2) The feature sketched contains no internal "rings", i.e., it consists of a single, simple linear ring
    // In WKT format: (1) Each point is represented by its X and Y coordinates SEPARATED BY A SPACE
    //                       (2) Points are DELIMITED BY A COMMA
    //
    lrCount = geometry.getLinearRingCount();
    if (lrCount !== 1) {
        alert("Sketched geometry contains more than one linear ring: NOT SUPPORTED.\nExiting");
        return;
    }
        
    wkt4poly = "POLYGON((";
    // Fill in the geometry of the polygon in WKT format
    tmp1 = geometry.getCoordinates();
    // Since we have only one linear ring, there is only one array of coordinates:
    aCoords = tmp1[0];
    for (i = 0; i < aCoords.length; i++) {
        tmp2 = aCoords[i][0] + " " + aCoords[i][1];
        if (i < aCoords.length -1) {
            tmp2 += ", ";
        }
        wkt4poly += tmp2;
    }
    cqlFilter += wkt4poly + "))"; // These parens close the WKT for the polygon geometry
    cqlFilter += ")"; // This paren closes the CQL INTERSECTS filter
    
    var szUrl = szWFSserverRoot + '?';
    szUrl += '&service=wfs';
    szUrl += '&version=1.0.0';
    szUrl += '&request=getfeature';
    szUrl += '&typename='+demographics_layer;
    szUrl += '&outputformat=json';
    szUrl += '&cql_filter=' + cqlFilter;    
    
     // DEBUG
    // console.log(szUrl);
        
    $.ajax({ url		: szUrl,
         type		: 'GET',
         dataType	: 'json',
         success	: 	function (data, textStatus, jqXHR) {	
                                var reader, aFeatures = [], props = {}, i, s;
                                reader = new ol.format.GeoJSON();
                                aFeatures = reader.readFeatures(jqXHR.responseText);
                                if (aFeatures.length === 0) {
                                    alert('WFS request to get data from spatial query returned no features.');
                                    return;
                                }
                                var _DEBUG_HOOK = 0;
                                renderTazData(aFeatures);
                            },
        error       :   function (qXHR, textStatus, errorThrown ) {
                            alert('WFS request to get data from spatial query failed.\n' +
                                    'Status: ' + textStatus + '\n' +
                                    'Error:  ' + errorThrown);
                        } // error handler for WFS request
    });   
} //executeSpatialQuery()

// OpenLayers 'map' object:
var ol_map = null;

var aMpoTowns = [
    [2, "ACTON"], [10, "ARLINGTON"], [14, "ASHLAND"],
    [23, "BEDFORD"], [25, "BELLINGHAM"], [26, "BELMONT"], [30, "BEVERLY"], [34, "BOLTON"],
	[35, "BOSTON"], [37, "BOXBOROUGH"], [40, "BRAINTREE"], [46, "BROOKLINE"], [48, "BURLINGTON"],
    [49, "CAMBRIDGE"], [50, "CANTON"], [51, "CARLISLE"], [57, "CHELSEA"], [65, "COHASSET"],
    [67, "CONCORD"],
    [71, "DANVERS"], [73, "DEDHAM"], [78, "DOVER"], [82, "DUXBURY"],
    [92, "ESSEX"], [93, "EVERETT"],
    [99, "FOXBOROUGH"], [100, "FRAMINGHAM"], [101, "FRANKLIN"],
    [107, "GLOUCESTER"],
    [119, "HAMILTON"], [122, "HANOVER"], [131, "HINGHAM"], [133, "HOLBROOK"], [136, "HOLLISTON"],
    [139, "HOPKINTON"], [141, "HUDSON"], [142, "HULL"],
    [144, "IPSWICH"],
    [155, "LEXINGTON"], [157, "LINCOLN"], [158, "LITTLETON"], [163, "LYNN"], [164, "LYNNFIELD"],
    [165, "MALDEN"], [166, "MANCHESTER"], [168, "MARBLEHEAD"], [170, "MARLBOROUGH"], [171, "MARSHFIELD"],
    [174, "MAYNARD"], [175, "MEDFIELD"], [176, "MEDFORD"], [177, "MEDWAY"], [178, "MELROSE"],
    [184, "MIDDLETON"], [185, "MILFORD"], [187, "MILLIS"], [189, "MILTON"],
    [196, "NAHANT"], [198, "NATICK"], [199, "NEEDHAM"], [207, "NEWTON"], [208, "NORFOLK"],
    [213, "NORTH READING"], [219, "NORWELL"], [220, "NORWOOD"],
    [229, "PEABODY"], [231, "PEMBROKE"],
    [243, "QUINCY"],
    [244, "RANDOLPH"], [246, "READING"], [248, "REVERE"], [251, "ROCKLAND"], [252, "ROCKPORT"],
    [258, "SALEM"], [262, "SAUGUS"], [264, "SCITUATE"], [266, "SHARON"], [269, "SHERBORN"],
    [274, "SOMERVILLE"], [277, "SOUTHBOROUGH"], [284, "STONEHAM"], [285, "STOUGHTON"], [286, "STOW"],
    [288, "SUDBURY"], [291, "SWAMPSCOTT"],
    [298, "TOPSFIELD"],
    [305, "WAKEFIELD"], [307, "WALPOLE"], [308, "WALTHAM"], [314, "WATERTOWN"],  [315, "WAYLAND"],
    [317, "WELLESLEY"], [320, "WENHAM"], [333, "WESTON"], [335, "WESTWOOD"], [336, "WEYMOUTH"],
    [342, "WILMINGTON"],  [344, "WINCHESTER"], [346, "WINTHROP"], [347, "WOBURN"],  [350, "WRENTHAM"]
];  // aMpoTowns[];

// Function: initialize()
//     Initializes OpenLayers map, gets MassGIS basemap service properties by executing AJAX request
//
function initialize() {  
    // 1. Initialize OpenLayers map, gets MassGIS basemap service properties by executing AJAX request
    $.ajax({ url: mgis_serviceUrls['topo_features'], jsonp: 'callback', dataType: 'jsonp', data: { f: 'json' }, 
             success: function(config) {     
                // Body of "success" handler starts here.
                // Get resolutions
                var tileInfo = config.tileInfo;
                var resolutions = [];
                for (var i = 0, ii = tileInfo.lods.length; i < ii; ++i) {
                    resolutions.push(tileInfo.lods[i].resolution);
                }               
                // Get projection
                var epsg = 'EPSG:' + config.spatialReference.wkid;
                var units = config.units === 'esriMeters' ? 'm' : 'degrees';
                var projection = ol.proj.get(epsg) ? ol.proj.get(epsg) : new ol.proj.Projection({ code: epsg, units: units });                              
                // Get attribution
                var attribution = new ol.control.Attribution({ html: config.copyrightText });               
                // Get full extent
                var fullExtent = [config.fullExtent.xmin, config.fullExtent.ymin, config.fullExtent.xmax, config.fullExtent.ymax];
                
                var tileInfo = config.tileInfo;
                var tileSize = [tileInfo.width || tileInfo.cols, tileInfo.height || tileInfo.rows];
                var tileOrigin = [tileInfo.origin.x, tileInfo.origin.y];
                var urls;
                var suffix = '/tile/{z}/{y}/{x}';
                urls = [mgis_serviceUrls['topo_features'] += suffix];               
                var width = tileSize[0] * resolutions[0];
                var height = tileSize[1] * resolutions[0];     
                var tileUrlFunction, extent, tileGrid;               
                if (projection.getCode() === 'EPSG:4326') {
                    tileUrlFunction = function tileUrlFunction(tileCoord) {
                        var url = urls.length === 1 ? urls[0] : urls[Math.floor(Math.random() * (urls.length - 0 + 1)) + 0];
                        return url.replace('{z}', (tileCoord[0] - 1).toString()).replace('{x}', tileCoord[1].toString()).replace('{y}', (-tileCoord[2] - 1).toString());
                    };
                } else {
                    extent = [tileOrigin[0], tileOrigin[1] - height, tileOrigin[0] + width, tileOrigin[1]];
                    tileGrid = new ol.tilegrid.TileGrid({ origin: tileOrigin, extent: extent, resolutions: resolutions });
                }     

                // Layer 1 - topographic features
                var layerSource;
                layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                                  tileSize: tileSize, tileGrid: tileGrid,
                                                  tileUrlFunction: tileUrlFunction, urls: urls });
                                  
                mgis_basemap_layers['topo_features'] = new ol.layer.Tile();
                mgis_basemap_layers['topo_features'].setSource(layerSource);
                mgis_basemap_layers['topo_features'].setVisible(true);
                
                // We make the rash assumption that since this set of tiled basemap layers were designed to overlay one another,
                // their projection, extent, and resolutions are the same.
                
                 // Layer 2 - structures
                urls = [mgis_serviceUrls['structures'] += suffix];  
                layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                                  tileSize: tileSize, tileGrid: tileGrid,
                                                  tileUrlFunction: tileUrlFunction, urls: urls });;
                mgis_basemap_layers['structures'] = new ol.layer.Tile();
                mgis_basemap_layers['structures'].setSource(layerSource); 
                mgis_basemap_layers['structures'].setVisible(true);          
                
                // Layer 3 - "detailed" features - these include labels
                urls = [mgis_serviceUrls['basemap_features'] += suffix];  
                layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                                  tileSize: tileSize, tileGrid: tileGrid,
                                                  tileUrlFunction: tileUrlFunction, urls: urls });                                  
                mgis_basemap_layers['basemap_features'] = new ol.layer.Tile();
                mgis_basemap_layers['basemap_features'].setSource(layerSource);
                mgis_basemap_layers['basemap_features'].setVisible(true);

                // Create OpenLayers map
                ol_map = new ol.Map({ layers: [   mgis_basemap_layers['topo_features'],
                                                                mgis_basemap_layers['structures'],
                                                                mgis_basemap_layers['basemap_features'],
                                                                oTazLayer,
                                                                vectorDrawingLayer
                                              ],
                                       target: 'map',
                                       view:   new ol.View({ center: ol.proj.fromLonLat([-71.0589, 42.3601]), zoom: 11 })
                                    });     

                 // Initialize combo box of towns
                 var i;
                 for (i = 0; i < aMpoTowns.length; i++) {
                     $('#select_town').append($('<option>', { value: aMpoTowns[i][0],     
                                                                              text : aMpoTowns[i][1] }));  
                    
                }
                
                // Arm event handlers for UI controls:
                //
                // Arm on-click event handler for "reset map" button
                $('#reset_map').on('click', function(e) {
                    // Clear TAZ vector layer and output_div
                    var vSource = oTazLayer.getSource();
                    vSource.clear();  
                    $('#output_div').html('');
                    // Clear the "sketch" vector layer 
                    vSource = vectorDrawingLayer.getSource();
                    vSource.clear();
                    // Set the map view to it's initial view
                    var view = new ol.View({ center: ol.proj.fromLonLat([-71.0589, 42.3601]), zoom: 11 });
                    ol_map.setView(view);
                });
                
                // Arm on-change event handler for "select town" combo box
                $('#select_town').on('change', function(e) {
                     var town_id = $('#select_town').find(":selected").val();
                     var query_string = "town_id=" + town_id;
                     executeTabularQuery(query_string);
                });
                 
                // Arm on-click event handler for "sketch" button
                $('#sketch_button').on('click', sketchHandler);
                
                // Arm on-click event handler to clear vector layer of selected TAZes
                $('#clear_tazes').on('click', clearTazLayer);
                
                // Arm on-click event handler for "download data" button
                $('#download_data').on('click', function(e) {
                    alert("Implementation of 'download data' functionality is currently TBD.");
                });
                
                // Arm on-click event handler for "help" button
                //
                function popup(url) {
		            var popupWindow = window.open(url,
                                                                    'popUpWindow','height=700,width=800,left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes');
	            } // popup()
               $('#help_button').on('click', function(e) {
                    popup("ejAppHelp.html");  
               });
            }, // end of 'success' handler for AJAX request
     error: function()  {
                alert("Error during initialization: Error return from AJAX request to get MassGIS base map properties.\nApplication exiting.");
            }  // end of 'error' handler for AJAX request
    }); // end of AJAZ request
} // initialize()
