import React, { useState } from 'react';
import { Stage, Layer, Image } from 'react-konva';
import useImage from 'use-image';
import ObjectLayer from './ObjectLayer';

const CanvasImage = ({ src }) => {
  const [image] = useImage(src);
  return <Image image={image} />;
};

const Canvas = ({ baseImage, objectLayers, stageRef }) => {
  const [selectedLayer, setSelectedLayer] = useState(null);

  return (
    <Stage
      width={1024}
      height={1024}
      ref={stageRef}
      onMouseDown={(e) => {
        // deselect when clicked on empty area
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
          setSelectedLayer(null);
        }
      }}
    >
      <Layer>
        {baseImage && <CanvasImage src={baseImage} />}
        {objectLayers.map((layer) => (
          <ObjectLayer
            key={layer.id}
            image={layer.image}
            isSelected={layer.id === selectedLayer}
            onSelect={() => {
              setSelectedLayer(layer.id);
            }}
            visible={layer.visible}
          />
        ))}
      </Layer>
    </Stage>
  );
};

export default Canvas;
