import React, { useState, useRef, useCallback } from 'react';
import Konva from 'konva';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './App.css';
import Canvas from './Canvas';
import LayerItem from './LayerItem';

function App() {
  const [baseImage, setBaseImage] = useState(null);
  const [baseState, setBaseState] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [objectLayers, setObjectLayers] = useState([]);
  const stageRef = useRef(null);
  const [finalImage, setFinalImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const baseInputRef = useRef(null);
  const objectsInputRef = useRef(null);
  const [userPrompt, setUserPrompt] = useState('');

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleBaseImageUpload = async (eventOrFiles) => {
    const files = eventOrFiles.target ? eventOrFiles.target.files : eventOrFiles;
    if (!files || !files[0]) return;
    const dataUrl = await readFileAsDataURL(files[0]);
    setBaseImage(dataUrl);
  };

  const handleObjectLayerUpload = async (eventOrFiles) => {
    const files = eventOrFiles.target ? eventOrFiles.target.files : eventOrFiles;
    if (!files || files.length === 0) return;
    const reads = Array.from(files).map((file) => readFileAsDataURL(file));
    const images = await Promise.all(reads);
    setObjectLayers((prev) => [
      ...prev,
      ...images.map((img) => ({
        id: `${Date.now()}${Math.floor(Math.random() * 1000000)}`,
        image: img,
        visible: true,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
      }))
    ]);
  };

  const handleGenerate = async () => {
    if (!baseImage || !stageRef.current) return;
    try {
      setIsGenerating(true);
      const stage = stageRef.current;

      const exportIdsOffscreen = async (ids) => {
        const { width, height } = stage.size();
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        document.body.appendChild(container);
        try {
          const offStage = new Konva.Stage({ container, width, height });
          const layer = new Konva.Layer();
          offStage.add(layer);
          ids.forEach((id) => {
            const srcNode = stage.findOne(`#${id}`);
            if (!srcNode) return;
            const attrs = srcNode.getAttrs();
            const imgObj = srcNode.image();
            const clone = new Konva.Image({ ...attrs, image: imgObj, visible: true, listening: false });
            layer.add(clone);
          });
          offStage.draw();
          await new Promise((r) => requestAnimationFrame(r));
          const dataUrl = offStage.toDataURL({ mimeType: 'image/png', quality: 1 });
          offStage.destroy();
          return dataUrl;
        } finally {
          document.body.removeChild(container);
        }
      };

      const base = await exportIdsOffscreen(['base-image']);
      const objs = [];
      for (const l of objectLayers) {
        // export sequentially to avoid visibility race conditions
        // when toggling nodes on the shared stage
        // eslint-disable-next-line no-await-in-loop
        const objImg = await exportIdsOffscreen([`obj-${l.id}`]);
        objs.push(objImg);
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'pipeline', base, objects: objs, userPrompt }),
      });
      const data = await response.text();
      setFinalImage(data);
    } finally {
      setIsGenerating(false);
    }
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

  const handleClearObjects = () => setObjectLayers([]);

  const toggleLayerVisibility = (id) => {
    const newObjectLayers = objectLayers.map((layer) => {
      if (layer.id === id) {
        return { ...layer, visible: !layer.visible };
      }
      return layer;
    });
    setObjectLayers(newObjectLayers);
  };

  const removeLayer = (id) => {
    setObjectLayers((prev) => prev.filter((l) => l.id !== id));
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

  const handleObjectChange = (id, attrs) => {
    setObjectLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...attrs } : l)));
  };

  const handleBaseChange = (attrs) => setBaseState((prev) => ({ ...prev, ...attrs }));

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <header className="app-header">
          <div className="brand">Nano Banana Studio</div>
          <div className="actions">
            <button className="btn" onClick={handleClearObjects} disabled={!objectLayers.length}>Clear Objects</button>
            <button className="btn primary" onClick={handleGenerate} disabled={!baseImage || isGenerating}>
              {isGenerating ? 'Generating…' : 'Generate Final'}
            </button>
            <button className="btn" onClick={handleExport} disabled={!finalImage}>Export PNG</button>
          </div>
        </header>

        <div className="main-content">
          <aside className="sidebar">
            <section className="panel">
              <h3>Base Image</h3>
              <div
                className="dropzone"
                role="button"
                tabIndex={0}
                onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') baseInputRef.current?.click(); }}
                onClick={() => baseInputRef.current?.click()}
                onDragOver={(e)=>e.preventDefault()}
                onDrop={(e)=>{e.preventDefault(); handleBaseImageUpload(e.dataTransfer.files);}}
              >
                <span>Click or drop image</span>
              </div>
              <input ref={baseInputRef} type="file" accept="image/*" onChange={handleBaseImageUpload} hidden id="base-input" />
              {baseImage && <img className="thumb" src={baseImage} alt="base" />}
            </section>

            <section className="panel">
              <h3>Objects</h3>
              <div
                className="dropzone"
                role="button"
                tabIndex={0}
                onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') objectsInputRef.current?.click(); }}
                onClick={() => objectsInputRef.current?.click()}
                onDragOver={(e)=>e.preventDefault()}
                onDrop={(e)=>{e.preventDefault(); handleObjectLayerUpload(e.dataTransfer.files);}}
              >
                <span>Click or drop images (multi)</span>
              </div>
              <input ref={objectsInputRef} type="file" accept="image/*" multiple onChange={handleObjectLayerUpload} hidden id="objects-input" />
              <div className="layer-list">
                {objectLayers.map((layer, index) => (
                  <LayerItem key={layer.id} index={index} id={layer.id} moveLayer={moveLayer}>
                    <div className="layer-item">
                      <img className="layer-thumb" src={layer.image} alt="obj" />
                      <div className="layer-meta">
                        <div className="layer-title">Object {index + 1}</div>
                        <div className="layer-controls">
                          <label className="toggle">
                            <input type="checkbox" checked={layer.visible} onChange={() => toggleLayerVisibility(layer.id)} />
                            <span>{layer.visible ? 'Visible' : 'Hidden'}</span>
                          </label>
                          <button className="icon-btn" onClick={() => removeLayer(layer.id)} title="Delete">✕</button>
                        </div>
                      </div>
                    </div>
                  </LayerItem>
                ))}
              </div>
            </section>
          </aside>

          <main className="canvas-container">
            <Canvas
              baseImage={baseImage}
              baseState={baseState}
              onBaseChange={handleBaseChange}
              objectLayers={objectLayers}
              onObjectChange={handleObjectChange}
              stageRef={stageRef}
            />
          </main>

          <aside className="inspector">
            <section className="panel">
              <h3>Output</h3>
              <div className="field">
                <label htmlFor="user-prompt">User Prompt (optional)</label>
                <textarea id="user-prompt" rows="3" placeholder="e.g., warmer lighting, soft shadows"
                  value={userPrompt}
                  onChange={(e)=>setUserPrompt(e.target.value)}
                  className="textarea"
                />
              </div>
              {finalImage ? (
                <img className="final" src={finalImage} alt="final" />
              ) : (
                <div className="placeholder">No output yet</div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </DndProvider>
  );
}

export default App;
