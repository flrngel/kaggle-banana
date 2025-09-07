import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image, Transformer } from 'react-konva';
import useImage from 'use-image';
import ObjectLayer from './ObjectLayer';

const BaseImage = ({ src, x, y, scale = 1, rotation = 0, draggable, onChange, onSelect, isSelected }) => {
  const [image] = useImage(src);
  const shapeRef = useRef();
  const trRef = useRef();
  useEffect(() => {
    if (isSelected && shapeRef.current && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);
  return (
    <>
      <Image
        id="base-image"
        name="base-image"
        image={image}
        ref={shapeRef}
        x={x}
        y={y}
        scaleX={scale}
        scaleY={scale}
        rotation={rotation}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => onChange?.({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const newScale = node.scaleX();
          onChange?.({ x: node.x(), y: node.y(), scale: newScale, rotation: node.rotation() });
        }}
      />
      {isSelected && <Transformer ref={trRef} />}
    </>
  );
};

const Canvas = ({ baseImage, objectLayers, stageRef, baseState, onBaseChange, onObjectChange }) => {
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 1024, height: 1024 });

  const [baseImageEl] = useImage(baseImage || null);

  useEffect(() => {
    if (baseImageEl && baseImageEl.width && baseImageEl.height) {
      setStageSize({ width: baseImageEl.width, height: baseImageEl.height });
    }
  }, [baseImageEl]);

  const handleDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) setSelectedLayer(null);
  };

  return (
    <Stage
      width={stageSize.width}
      height={stageSize.height}
      ref={stageRef}
      onMouseDown={handleDeselect}
    >
      <Layer>
        {baseImage && (
          <BaseImage
            src={baseImage}
            x={baseState.x}
            y={baseState.y}
            scale={baseState.scale}
            rotation={baseState.rotation}
            draggable
            onChange={(attrs) => onBaseChange(attrs)}
            onSelect={() => setSelectedLayer('base')}
            isSelected={selectedLayer === 'base'}
          />
        )}
        {objectLayers.map((layer) => (
          <ObjectLayer
            key={layer.id}
            id={layer.id}
            image={layer.image}
            x={layer.x}
            y={layer.y}
            scale={layer.scale}
            rotation={layer.rotation}
            isSelected={layer.id === selectedLayer}
            onSelect={() => setSelectedLayer(layer.id)}
            visible={layer.visible}
            onChange={(attrs) => onObjectChange(layer.id, attrs)}
            stageSize={stageSize}
          />
        ))}
      </Layer>
    </Stage>
  );
};

export default Canvas;
