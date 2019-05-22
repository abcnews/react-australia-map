import React, { useRef, useLayoutEffect, useEffect, useState } from 'react';
import styles from './styles.scss';

import * as d3 from 'd3-selection';
import * as Geo from 'd3-geo';
import 'd3-transition';

import * as TopoJSON from 'topojson';
const mapJSON = require('./topology.json');

let data;

let width;
let height;
let projection;
let path;
let svg;
let features;
let mapZoom;
let mapX = 0;
let mapY = 0;

let legend;
let locationLabel;
let otherLabels;

/**
 * Props {
 *   fill(datum: any): string,
 *   labelText(datum: any): string,
 *   disableClicks: boolean,
 *   data: [any],
 *   processData(d: any),
 *   setupLegend(svg: D3Element, legend: D3Element),
 *   marker: {
 *     electorate: string,
 *     zoom: number
 *   }
 *   onZoom(zoomFactor: number, svg: D3Element, legend: D3Element)
 * }
 */
export default props => {
  const base = useRef(null);
  const [currentElectorate, setCurrentElectorate] = useState(null);

  function createLabel(features) {
    const label = features.append('g');
    let balloonWidth = 280;
    let locationLabelBalloon = label
      .append('g')
      .attr('fill', 'black')
      .style('pointer-events', 'none')
      .attr('transform', `translate(-${balloonWidth / 2}, -69)`);
    locationLabelBalloon
      .append('polygon')
      .attr('points', '0,0 10,20, 20,0')
      .attr('transform', `translate(${balloonWidth / 2 - 10}, 49)`);
    locationLabelBalloon
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('width', balloonWidth)
      .attr('height', 50);
    locationLabelBalloon
      .append('text')
      .attr('font-size', 22)
      .attr('fill', 'white')
      .style('text-anchor', 'middle')
      .attr('x', balloonWidth / 2)
      .attr('y', 33)
      .text('');
    return label;
  }

  function updateLabel(label, d, k) {
    if (!d) return;

    // shrink the labels a bit
    k = k * 1.3;

    let x = d.x;
    let y = d.y;

    // Some electorates are split over water so we need
    // to adjust where the label pin goes
    let bounds;
    switch (d.properties.name.toLowerCase()) {
      case 'bowman':
        bounds = path.bounds(d);
        x = bounds[0][0] + (bounds[1][0] - bounds[0][0]) * 0.2;
        break;
      case 'bonner':
        bounds = path.bounds(d);
        x = bounds[0][0] + (bounds[1][0] - bounds[0][0]) * 0.2;
        y = bounds[0][1] + (bounds[1][1] - bounds[0][1]) * 0.8;
        break;
      case 'mayo':
        bounds = path.bounds(d);
        x = bounds[0][0] + (bounds[1][0] - bounds[0][0]) * 0.8;
        y = bounds[0][1] + (bounds[1][1] - bounds[0][1]) * 0.5;
        break;
      case 'parkes':
        bounds = path.bounds(d);
        x = bounds[0][0] + (bounds[1][0] - bounds[0][0]) * 0.7;
        break;
      case 'fenner':
        bounds = path.bounds(d);
        x = bounds[0][0] + (bounds[1][0] - bounds[0][0]) * 0.1;
        break;
      default:
      // nothing
    }

    label.attr('transform', `translate(${x}, ${y}) scale(${1 / k})`).style('opacity', 1);

    var text = label.select('text');

    let updatedText = d.properties.name;
    if (typeof props.labelText === 'function') updatedText = props.labelText(d);
    if (updatedText !== text.text()) text.text(updatedText);
  }

  // Initialise the map
  useLayoutEffect(() => {
    width = window.innerWidth;
    height = window.innerHeight;
    svg = d3
      .select(base.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    projection = Geo.geoMercator()
      .scale(width * 0.9)
      .center([131, -27])
      .translate([width / 2, height / 2]);
    path = Geo.geoPath().projection(projection);

    // Graft the support onto the map data
    data = TopoJSON.feature(mapJSON, mapJSON.objects.map).features.map(f => {
      f.x = path.centroid(f)[0];
      f.y = path.centroid(f)[1];

      if (typeof props.processData === 'function') f = props.processData(f);

      return f;
    });

    features = svg.append('g').attr('class', styles.features);
    features
      .selectAll('path')
      .data(data)
      .enter()
      .append('path')
      .attr('d', path)
      .style('fill', d => {
        if (typeof props.fill === 'undefined') return 'black';
        return props.fill(d);
      })
      .on('click', d => {
        if (typeof props.disableClicks !== 'undefined' || props.disableClicks === true) return;
        zoomTo({ config: { electorate: d.properties.name } }, true);
      });

    // TODO: maybe every electorate should get its own label?
    otherLabels = [
      createLabel(features),
      createLabel(features),
      createLabel(features),
      createLabel(features),
      createLabel(features),
      createLabel(features),
      createLabel(features),
      createLabel(features)
    ];
    locationLabel = createLabel(features);

    // Legend
    if (typeof props.setupLegend === 'function') props.setupLegend(svg, legend);

    // Start by showing all of Australia
    zoomTo(null, false, 0);
  }, []);

  // Recalculate the map when the window resizes
  useEffect(() => {
    function onResize() {
      if (window.innerWidth !== width || window.innerHeight !== height) {
        width = window.innerWidth;
        height = window.innerHeight;
        svg.attr('width', width).attr('height', height);

        projection = Geo.geoMercator()
          .scale(width * 0.9)
          .center([131, -27])
          .translate([width / 2, height / 2]);
        path = Geo.geoPath().projection(projection);
        features.selectAll('path').attr('d', path);

        data = TopoJSON.feature(mapJSON, mapJSON.objects.map).features.map(f => {
          f.x = path.centroid(f)[0];
          f.y = path.centroid(f)[1];
          return f;
        });

        zoomTo(props.marker, false, 0);

        const legendX = (width - 300) / 2;
        const legendY = height - 115;
        legend.attr('transform', `translate(${legendX}, ${legendY})`);
      }
    }

    if (window.__ODYSSEY__) {
      window.__ODYSSEY__.scheduler.subscribe(onResize);
    } else {
      window.addEventListener('resize', onResize);
    }

    return () => {
      if (window.__ODYSSEY__) {
        window.__ODYSSEY__.scheduler.unsubscribe(onResize);
      } else {
        window.removeEventListener('resize', onResize);
      }
    };
  }, []);

  // Zoom to the latest marker
  useEffect(() => {
    zoomTo(props.marker);
  }, [props.marker]);

  /**
   * Find an electorate within the dataset
   * @param {string} name
   */
  function findElectorate(name) {
    if (!name) return false;
    return data.find(d => {
      return d.properties.name.toLowerCase().replace(/[^a-z]/, '') === name.toLowerCase().replace(/[^a-z]/, '');
    });
  }

  /**
   * Move and zoom to a point on the map based on marker information.
   *
   * interface Marker {
   *   config: {
   *     electorate: string,
   *     and: Array<string>,
   *     hide: boolean,
   *     zoom: number
   *   }
   * }
   * @param {Marker} marker
   * @param {boolean} wasClicked Specify whether a click triggered this zoom
   * @param {number} transitionDampener 0 to disable transitions for this action
   */
  function zoomTo(marker, wasClicked, transitionDampener) {
    if (typeof transitionDampener === 'undefined') transitionDampener = 1;

    // find the electorate
    let d = findElectorate(marker && marker.config.electorate);

    let x;
    let y;
    let k;

    let electorate;

    if (d) {
      let renderMain = true;
      let others = [];
      let renderOthers = true;

      // Find any other electorates
      otherLabels.forEach(l => l.style('opacity', 0));
      if (marker && marker.config.and) {
        others = [].concat(marker.config.and).map(findElectorate);

        // Mobile tweaks
        if (width < 440) {
          const name = marker.config.electorate.toLowerCase();
          // Sydney and Chiffley -> hide chiffley
          if (name === 'sydney' && others[0].properties.name.toLowerCase() === 'chifley') {
            renderOthers = false;
          } else if (name === 'griffith') {
            renderMain = false;
            renderOthers = false;
          } else if (name == 'maranoa') {
            renderOthers = false;
          }
        } else if (width < 1000) {
          if (name === 'griffith') {
            renderMain = false;
            renderOthers = false;
          }
        }
      }

      // Compute the new map center and scale to zoom to
      if (others.length == 0) {
        x = d.x;
        y = d.y;
      } else {
        let minX = Infinity;
        let maxX = 0;
        let minY = Infinity;
        let maxY = 0;
        [d].concat(others).forEach(data => {
          minX = Math.min(minX, data.x);
          maxX = Math.max(maxX, data.x);
          minY = Math.min(minY, data.y);
          maxY = Math.max(maxY, data.y);
        });

        x = minX + (maxX - minX) / 2;
        y = minY + (maxY - minY) / 2;
      }

      if (marker && marker.config.zoom) {
        k = parseInt(marker.config.zoom, 10);
      } else if (wasClicked) {
        // Detect zoom level for whole of electorate
        var b = path.bounds(d);
        k = 0.8 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
        k = Math.min(50, k);
      } else {
        k = 50; // Ok-ish zoom to a normal electorate level (based on Brisbane)
      }

      // Zoom in a bit on mobile
      if (width < 440) {
        k = k + k / 4;
      }

      // Move the map pin and center the text
      updateLabel(locationLabel, d, k);

      // Hide the main maker if need be
      if ((marker && marker.config.hide) || renderMain === false) {
        locationLabel.style('opacity', 0);
      } else {
        locationLabel.style('opacity', 1);
      }

      let names = [];
      if (renderOthers) {
        others = others.forEach((data, index) => {
          if (data) names.push(data.properties.name);
          updateLabel(otherLabels[index], data, k);
        });
      }

      // Bring the current electorates to the front
      features.selectAll('path').sort((a, b) => {
        // main electorate
        if (a.properties.name !== d.properties.name) return -1;
        // other electorates
        if (names.indexOf(a.properties.name) > -1) return -1;
        // everything else
        return 1;
      });

      electorate = d;
    } else {
      x = width / 2 + width * 0.05; // for some reason the map isn't exactly centered when zoomed out
      y = height / 2;
      k = 0.8;

      // mobile width gets a different zoom
      if (width < 440) {
        k = 0.8 * 1.55;
      }

      locationLabel.style('opacity', 0);
      otherLabels.forEach(l => l.style('opacity', 0));

      electorate = null;
    }

    // Don't zoom again
    if (k === mapZoom && currentElectorate === electorate) return;

    // Highlight the new feature
    features
      .selectAll('path')
      .transition()
      .duration(1400 * transitionDampener);

    // if the diff of the x and y are both huge then zoom out first
    const diffX = Math.abs(x - mapX);
    const diffY = Math.abs(y - mapY);
    const diffZoom = Math.abs(k - mapZoom);
    const isFarAway = diffX > 100 || diffY > 100;
    if (diffY !== 0 && mapZoom >= 2 && k >= 2 && isFarAway) {
      // Middle zoom is the same as the current zoom if it is bigger than the new zoom
      let middleZoom;
      // Bounce out a bit if the zooms are within 10% of each other
      if (k > 5 && diffZoom < Math.max(mapZoom, k) / 2) {
        middleZoom = Math.min(mapZoom / 2, 5);
      } else {
        middleZoom = Math.min(mapZoom, k);
      }

      features
        .transition()
        .duration(800 * transitionDampener)
        .attr('transform', `translate(${width / 2}, ${height / 2}) scale(${middleZoom}) translate(${-x}, ${-y})`)
        .transition()
        .duration(600 * transitionDampener)
        .attr('transform', `translate(${width / 2}, ${height / 2}) scale(${k}) translate(${-x}, ${-y})`);
    } else {
      features
        .transition()
        .duration(1000 * transitionDampener)
        .attr('transform', `translate(${width / 2}, ${height / 2}) scale(${k}) translate(${-x}, ${-y})`);
    }

    // Inverse zoom for scaling strokes, etc
    let factor = 1 / (k || 1);
    features
      .selectAll('path')
      .transition()
      .duration(900 * transitionDampener)
      .attr('stroke-width', 0.5 * factor);

    if (typeof props.onZoom === 'function') props.onZoom(factor, svg, legend);

    mapX = x;
    mapY = y;
    mapZoom = k;

    setCurrentElectorate(electorate);
  }

  return <div className={styles.base} ref={base} />;
};
