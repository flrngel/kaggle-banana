import React, { useState, useEffect, useRef } from 'react';
import { Image, Transformer } from 'react-konva';
import useImage from 'use-image';

const ObjectLayer = ({ image, onSelect, isSelected, visible }) => {
  const [img] = useImage(image);
  const [mask, setMask] = useState(null);
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (!img) return;

    const worker = new Worker("./worker.js");

    worker.onmessage = (event) => {
      const { blob } = event.data;
      const url = URL.createObjectURL(blob);
      setMask(url);
    };

    // Create a temporary canvas to get the image data
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    worker.postMessage({ image: imageData });

    return () => {
      worker.terminate();
    };
  }, [img]);

  const [maskImage] = useImage(mask);

  useEffect(() => {
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Image
        image={maskImage}
        ref={shapeRef}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        visible={visible}
      />
      {isSelected && <Transformer ref={trRef} />}
    </>
  );
};

export default ObjectLayer;
