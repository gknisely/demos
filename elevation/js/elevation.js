var app = angular.module('elevation', []);
var hash_params = L.Hash.parseHash(location.hash);

serviceUrl = server.prod;
token = accessToken.prod;

//??
app.run(function($rootScope) {
  var hash_loc = hash_params ? hash_params : {
    'center' : {
      'lat' : 47.2200,
      'lng' :  9.3357
    },
    'zoom' : 12
  };
  $rootScope.geobase = {
    'zoom' : hash_loc.zoom,
    'lat' : hash_loc.center.lat,
    'lon' : hash_loc.center.lng
  }
  $(document).on('new-location', function(e) {
    $rootScope.geobase = {
      'zoom' : e.zoom,
      'lat' : e.lat,
      'lon' : e.lon
    };
  })
});

//hooks up to the div whose data-ng-controller attribute matches this name
app.controller('ElevationController', function($scope, $rootScope, $sce, $http) {
  //various tile sets
  var baseMaps = {
    RoadMap : L.tileLayer('http://otile3.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', {
      attribution : 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>'
    }),
    CycleMap : L.tileLayer('http://b.tile.thunderforest.com/cycle/{z}/{x}/{y}.png', {
      attribution : 'Maps &copy; <a href="http://www.thunderforest.com">Thunderforest, </a>;Data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }),
    TransitMap : L.tileLayer(' http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png', {
      attribution : 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>'
    })
  };

  //leaflet slippy map
  var map = L.map('map', {
    zoom : $rootScope.geobase.zoom,
    zoomControl : false,
    layers : [ baseMaps.CycleMap ],
    center : [ $rootScope.geobase.lat, $rootScope.geobase.lon ]
  });

  //add the tile set chooser to the map
  L.control.layers(baseMaps, null).addTo(map);
  
  //??
  $scope.renderHtml = function(html_code) {
    return $sce.trustAsHtml(html_code);
  };
  
  //icon for point on the map
  var resampledPt = function(icon) {
    return L.icon({
      iconUrl : 'resource/bluedot.png',
      iconSize : [ 10, 10 ],
      iconAnchor : [ 5, 5 ]
    });
  };

  //allow hash links
  var hash = new L.Hash(map);
  //place to store clicked locations
  var locations = [ {lat: 47.20365107869972, lon: 9.352025985717773 }, 
                    {lat: 47.27002789823629, lon: 9.341468811035154} ]
    
  //show something to start with
  $(window).load(function(e) {
    document.getElementById('resample_distance').value = "100";
    document.getElementById('sampling_text').innerHTML = '<h5>Sampling Distance: ' + document.getElementById('resample_distance').value + 'm</h5>';
    getElevation();
  });
  
  //place to store results
  var resampled = []
  
  //undraw all the points
  var clear = function() {
    resampled.forEach(function (e,i,a) {
      map.removeLayer(e);
    });
    resampled = [];
  };
  
  //make the request to get the elevation
  var getElevation = function() {    
    elev = L.Elevation.widget(token);
    elev.resetChart();
    elev.profile(locations, document.getElementById('resample_distance').value, marker_update);
    document.getElementById('graph').style.display = "block";
    $("#clearbtn").show();
  }
  
  //call back for use when a result comes back
  var marker_update = function(elevation) {    
    //undraw everything
    clear();

    //draw interpolations
    for(var i = 0; i < elevation.shape.length; i++) {
      var marker = new L.marker( [elevation.shape[i].lat, elevation.shape[i].lon], {icon : resampledPt()});
      marker.bindPopup('<pre style="display:inline" class="elv_point">height: ' + elevation.range_height[i][1] + 'm range: ' + elevation.range_height[i][0] + 'm</pre>');
      map.addLayer(marker);
      resampled.push(marker);
    }
  };

  //someone clicked, store the spot and show something
  map.on('click', function(e) {
      locations.push({
        'lat' : e.latlng.lat,
        'lon' : e.latlng.lng
      });
      
      //check the total number to see if its bonkers
      var length = 0.0;
      locations.forEach(function(e,i,a) {
        if(i != 0) {
          var previous = L.latLng(locations[i - 1].lat, locations[i - 1].lon);
          var current = L.latLng(e.lat, e.lon);
          length += previous.distanceTo(current);
        }
      });

      if(length / document.getElementById('resample_distance').value > 2500) {
        alert("You seem to be getting carried away. Try less locations closer together or increase the resampling distance");
        locations.pop();
      }
      else
        getElevation();
  });
  
  //someone clicked the clear button so reset
  $("#clearbtn").on("click", function() {
    clear();
    locations = [];
    elev.resetChart();
  });
  
  //someone clicked to get elevation
  $("#updatebtn").on("click", function() {
    if(locations.length == 0)
      alert("Click a few places on the map first");
    else
      getElevation();
  });
  
  //someone changed sampling
  $("#resample_distance").on("change", function() {
    document.getElementById('sampling_text').innerHTML = '<h5>Sampling Distance: ' + this.value + 'm</h5>';
  });
  $("#resample_distance").on("input", function() {
    document.getElementById('sampling_text').innerHTML = '<h5>Sampling Distance: ' + this.value + 'm</h5>';
  });
  
})