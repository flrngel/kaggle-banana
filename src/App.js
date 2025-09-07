import React, { useState, useRef, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './App.css';
import Canvas from './Canvas';
import LayerItem from './LayerItem';

function App() {
  const [baseImage, setBaseImage] = useState(null);
  const [objectLayers, setObjectLayers] = useState([]);
  const stageRef = useRef(null);
  const [finalImage, setFinalImage] = useState(null);

  const handleBaseImageUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setBaseImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleObjectLayerUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setObjectLayers([...objectLayers, { id: Date.now(), image: reader.result, visible: true }]);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    const uri = stageRef.current.toDataURL();
    const response = await fetch('/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ image: uri }),
    });
    const data = await response.text();
    setFinalImage(data);
  };

  const handleExport = () => {
    if (!finalImage) return;
    const link = document.createElement('a');
    link.download = 'final-image.png';
    link.href = finalImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleLayerVisibility = (id) => {
    const newObjectLayers = objectLayers.map((layer) => {
      if (layer.id === id) {
        return { ...layer, visible: !layer.visible };
      }
      return layer;
    });
    setObjectLayers(newObjectLayers);
  };

  const moveLayer = useCallback(
    (dragIndex, hoverIndex) => {
      const dragLayer = objectLayers[dragIndex];
      const newObjectLayers = [...objectLayers];
      newObjectLayers.splice(dragIndex, 1);
      newObjectLayers.splice(hoverIndex, 0, dragLayer);
      setObjectLayers(newObjectLayers);
    },
    [objectLayers],
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <div className="toolbar">
          <input type="file" onChange={handleBaseImageUpload} />
          <input type="file" onChange={handleObjectLayerUpload} />
          <button>Remove Background</button>
          <button onClick={handleGenerate}>Generate Final</button>
          <button onClick={handleExport}>Export PNG/WebP</button>
        </div>
        <div className="main-content">
          <div className="layer-list">
            <h2>Layers</h2>
            {objectLayers.map((layer, index) => (
              <LayerItem key={layer.id} index={index} id={layer.id} moveLayer={moveLayer}>
                <div key={layer.id}>
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={() => toggleLayerVisibility(layer.id)}
                  />
                  Object {layer.id}
                </div>
              </LayerItem>
            ))}
          </div>
          <div className="canvas-container">
            <Canvas
              baseImage={baseImage}
              objectLayers={objectLayers}
              stageRef={stageRef}
            />
          </div>
          <div className="properties-panel">
            <h2>Properties</h2>
            {finalImage && <img src={finalImage} alt="final" width="200" />}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

export default App;
