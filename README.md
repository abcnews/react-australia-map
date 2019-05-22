# Electorate Map

A map of Australian electorates to use in conjunction with [@abcnews/scrollyteller](https://github.com/abcnews/scrollyteller).

## Usage

`@abcnews/react-australia-map` is meant to be used within an `@abcnews/scrollyteller`.

```js
<Scrollyteller {...}>
  <Map
    data={data}
    processData={processData}
    setupLegend={setupLegend}
    marker={marker}
    onZoom={onZoom}
    fill={fill}
    labelText={labelText}
  />
</Scrollyteller>
```

**`processData(d)`** - For each data point, attach any extra information needed to helper render.

**`setupLegend(svg, legend)`** - Called after the main map is added to the svg. `legend` is a reference to an svg group that can also be referred to during `onZoom`.

**`marker`** - The current scrollyteller marker.

**`onZoom(zoomFactor, svg, legend)`** - Called after the main map has been located/zoomed. `zoomFactor` is inverse of the zoom level itself so that you can use it to scale things inversely to the map's zoom.

**`fill(d)`** - Given a data point, returns a colour string to fill that map segment.

**`labelText(d)`** - Given a data point, returns the string used to label that map segment.

## Authors

- Nathan Hoad - [hoad.nathan@abc.net.au](mailto:hoad.nathan@abc.net.au)
