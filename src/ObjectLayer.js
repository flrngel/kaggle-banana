import React, { useState, useEffect, useRef } from 'react';
import { Image, Transformer } from 'react-konva';
import useImage from 'use-image';

const ObjectLayer = ({ id, image, x = 0, y = 0, scale = 1, rotation = 0, onSelect, isSelected, visible, onChange, stageSize }) => {
  const [img] = useImage(image);
  const [mask, setMask] = useState(null);
  const shapeRef = useRef();
  const trRef = useRef();
  const didInitRef = useRef(false);

  useEffect(() => {
    if (!image) return;
    const worker = new Worker(new URL('./worker.js', import.meta.url));

    worker.onmessage = (event) => {
      const { blob } = event.data;
      if (blob) {
        const url = URL.createObjectURL(blob);
        setMask(url);
      }
    };

    // Send original data URL to worker; worker converts to Blob and removes bg
    worker.postMessage({ image });

    return () => {
      worker.terminate();
    };
  }, [image]);

  const [maskImage] = useImage(mask || null);

  // One-time auto-scale and center based on base/stage size and original image dimensions
  useEffect(() => {
    if (didInitRef.current) return;
    const baseW = stageSize?.width;
    const baseH = stageSize?.height;
    const natural = img; // use original image for reliable natural size
    if (!natural || !baseW || !baseH) return;
    if (scale !== 1) { didInitRef.current = true; return; }

    const targetW = Math.max(128, Math.min(512, Math.floor(baseW * 0.25)));
    const s = Math.max(0.05, Math.min(1, targetW / natural.width));
    const newW = natural.width * s;
    const newH = natural.height * s;
    const newX = Math.round((baseW - newW) / 2);
    const newY = Math.round((baseH - newH) / 2);
    didInitRef.current = true;
    onChange?.({ scale: s, x: newX, y: newY });
  }, [img, stageSize, scale, onChange]);

  useEffect(() => {
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const displayImage = maskImage || img;

  return (
    <>
      <Image
        id={`obj-${id}`}
        name={`obj-${id}`}
        image={displayImage}
        x={x}
        y={y}
        scaleX={scale}
        scaleY={scale}
        rotation={rotation}
        ref={shapeRef}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        visible={visible}
        onDragEnd={(e) => onChange?.({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const newScale = node.scaleX();
          onChange?.({ x: node.x(), y: node.y(), scale: newScale, rotation: node.rotation() });
        }}
      />
      {isSelected && <Transformer ref={trRef} />}
    </>
  );
};

export default ObjectLayer;
