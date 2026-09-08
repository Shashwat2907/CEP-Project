import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function AttendanceMap({
  sessionCenter,
  studentCoords,
  isInside,
  distanceMeters,
  height = '340px'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter = sessionCenter 
        ? [sessionCenter.latitude, sessionCenter.longitude]
        : (studentCoords ? [studentCoords.latitude, studentCoords.longitude] : [28.5450, 77.1926]);

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 17,
        zoomControl: true,
        attributionControl: false
      });

      // Dark theme tiles (CartoDB Dark Matter)
      const tileLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 20
        }
      );
      tileLayer.addTo(map);

      // Attribution in subtle text
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; OpenStreetMap')
        .addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers, Circles, and Lines when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const boundsPoints = [];

    // 1. Classroom Center & Geofence Perimeter
    if (sessionCenter && sessionCenter.latitude && sessionCenter.longitude) {
      const classroomPos = [sessionCenter.latitude, sessionCenter.longitude];
      boundsPoints.push(classroomPos);

      // Perimeter Circle
      const perimeterCircle = L.circle(classroomPos, {
        radius: sessionCenter.radius_meters || 100,
        color: '#38bdf8',
        fillColor: '#0284c7',
        fillOpacity: 0.14,
        weight: 2,
        dashArray: '6, 6'
      });
      perimeterCircle.bindPopup(
        `<div style="font-family: inherit; font-size: 12px; color: #111;">
          <strong>${sessionCenter.course_name || 'Active Session'}</strong><br/>
          Venue: ${sessionCenter.room || 'Classroom'}<br/>
          Perimeter Radius: <strong>${sessionCenter.radius_meters}m</strong>
        </div>`
      );
      layerGroup.addLayer(perimeterCircle);

      // Classroom Pin Marker
      const classroomIcon = L.divIcon({
        className: 'custom-classroom-divicon',
        html: `
          <div class="map-classroom-pin">
            <span class="pin-icon">🏛️</span>
            <span class="pin-label">${sessionCenter.room ? sessionCenter.room.split('-')[0].trim() : 'Room'}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const classroomMarker = L.marker(classroomPos, { icon: classroomIcon });
      classroomMarker.bindPopup(
        `<div style="font-family: inherit; font-size: 12px; color: #111;">
          <strong>Classroom Anchor Coordinates</strong><br/>
          ${sessionCenter.latitude.toFixed(5)}° N, ${sessionCenter.longitude.toFixed(5)}° E
        </div>`
      );
      layerGroup.addLayer(classroomMarker);
    }

    // 2. Student Location & GPS Accuracy
    if (studentCoords && studentCoords.latitude && studentCoords.longitude) {
      const studentPos = [studentCoords.latitude, studentCoords.longitude];
      boundsPoints.push(studentPos);

      // Accuracy ring if accuracy is available
      if (studentCoords.accuracy) {
        const accuracyCircle = L.circle(studentPos, {
          radius: Math.min(studentCoords.accuracy, 150),
          color: isInside ? '#22c55e' : '#ef4444',
          fillColor: isInside ? '#22c55e' : '#ef4444',
          fillOpacity: 0.08,
          weight: 1
        });
        layerGroup.addLayer(accuracyCircle);
      }

      // Pulsating Student Marker
      const studentIcon = L.divIcon({
        className: 'custom-student-divicon',
        html: `
          <div class="map-student-pulse ${isInside ? 'pulse-inside' : 'pulse-outside'}">
            <div class="pulse-ring"></div>
            <div class="pulse-core"></div>
            <div class="pulse-label">${studentCoords.isHardwareGps ? '📍 Live GPS' : (studentCoords.label || 'You')}</div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const studentMarker = L.marker(studentPos, { icon: studentIcon, zIndexOffset: 1000 });
      studentMarker.bindPopup(
        `<div style="font-family: inherit; font-size: 12px; color: #111;">
          <strong>Student Location Signal</strong><br/>
          Source: ${studentCoords.isHardwareGps ? 'Device Hardware GPS' : 'Simulation Preset'}<br/>
          Distance: <strong>${distanceMeters != null ? distanceMeters + 'm' : '--'}</strong><br/>
          Accuracy: ±${studentCoords.accuracy || 5}m
        </div>`
      );
      layerGroup.addLayer(studentMarker);

      // 3. Distance Polyline Vector between Student and Classroom Center
      if (sessionCenter && sessionCenter.latitude && sessionCenter.longitude) {
        const polyline = L.polyline([studentPos, [sessionCenter.latitude, sessionCenter.longitude]], {
          color: isInside ? '#22c55e' : '#f87171',
          weight: 2,
          opacity: 0.85,
          dashArray: '5, 8'
        });
        layerGroup.addLayer(polyline);
      }
    }

    // Auto-fit bounds with comfortable padding
    if (boundsPoints.length > 1) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds.pad(0.3), { animate: true, maxZoom: 18 });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 17, { animate: true });
    }

    // Trigger resize calculation
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [sessionCenter, studentCoords, isInside, distanceMeters]);

  return (
    <div className="map-container-wrapper" style={{ height }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
