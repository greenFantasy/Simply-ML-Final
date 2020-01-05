import React, { Component } from 'react';

function pathRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.lineTo(x, y + height - radius);
  ctx.arcTo(x, y + height, x + radius, y + height, radius);
  ctx.lineTo(x + width - radius, y + height);
  ctx.arcTo(x + width, y + height, x + width, y + height-radius, radius);
  ctx.lineTo(x + width, y + radius);
  ctx.arcTo(x + width, y, x + width - radius, y, radius);
  ctx.lineTo(x + radius, y);
  ctx.arcTo(x, y, x, y + radius, radius);
}

function getContext(id) {
  const canvas = document.getElementById(id);
  let context = null;
  if(canvas.getContext) {
    context = canvas.getContext("2d");
  }

  return context;
}

class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class BBox {
  // (x,y) is the normalized coordinate of the top-left corner,
  // while w and h are the normalized width and height, respectively
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  contains(p) {
    return p.x >= this.x && p.x <= (this.x+this.w) &&
           p.y >= this.y && p.y <= (this.y+this.h);
  }
}

class Layer {
  constructor(name, n_nodes, fill) {
    this.name = name;
    this.n_nodes = n_nodes;
    if(fill) {
      this.bbox = new BBox(0, 0, 1, 1);
    } else {
      this.bbox = new BBox(0.2, 0.5, 0.4, 0.05);
    }
    this.fillStyle = "#99F";
    this.strokeStyle = "#111";
    this.lineWidth = 1;
    this.edit = false;
  }

  setHover() {
    this.lineWidth = 2;
  }

  clearHover() {
    this.lineWidth = 1;
  }

  drawCurveTo(layer, ctx) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    let w = ctx.canvas.clientWidth;
    let h = ctx.canvas.clientHeight;
    let begin = new Vec2(layer.bbox.x + layer.bbox.w/2, layer.bbox.y + layer.bbox.h/2);
    let end = new Vec2(this.bbox.x + this.bbox.w/2, this.bbox.y + this.bbox.h/2);

    let cp1 = new Vec2(begin.x + layer.bbox.w/3, begin.y);
    let cp2 = new Vec2(end.x - this.bbox.w/3, end.y);

    ctx.beginPath();
    ctx.moveTo(w*begin.x, h*begin.y);
    ctx.bezierCurveTo(w*cp1.x, h*cp1.y, w*cp2.x, h*cp2.y, w*end.x, h*end.y);
    ctx.stroke();
  }

  drawBackground(ctx) {
    let w = ctx.canvas.clientWidth;
    let h = ctx.canvas.clientHeight;

    pathRoundedRect(ctx, this.bbox.x * w, this.bbox.y * h, this.bbox.w * w, this.bbox.h * h, 10);
  }

  drawEdit(ctx) {
    let w = ctx.canvas.clientWidth;
    let h = ctx.canvas.clientHeight;

    ctx.lineWidth = "1px";
    let p = 0.02;
    ctx.strokeRect(w*(this.bbox.x-p), h*(this.bbox.y-p), w*(this.bbox.w+2*p), h*(this.bbox.h+2*p));
  }

  draw(ctx) {
    let w = ctx.canvas.clientWidth;
    let h = ctx.canvas.clientHeight;

    ctx.fillStyle = this.fillStyle;
    ctx.strokeStyle = this.strokeStyle;
    ctx.lineWidth = this.lineWidth;

    if(this.edit) {
      this.drawEdit(ctx);
    }

    this.drawBackground(ctx);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "black";
    ctx.fillText(this.name, w*(this.bbox.x+this.bbox.w/2), h*(this.bbox.y+this.bbox.h/2));
  }
}

class InputLayer extends Layer {
  constructor(name, n_nodes, fill) {
    super(name, n_nodes, fill);
    this.fillStyle = "#9F9";
    this.bbox = new BBox(0.45, 0.1, 0.1, 0.1);
  }

  drawBackground(ctx) {
    let w = ctx.canvas.clientWidth;
    let h = ctx.canvas.clientHeight;

    ctx.beginPath();
    ctx.arc((this.bbox.x + this.bbox.w/2)*w, (this.bbox.y+this.bbox.h/2)*h, w*this.bbox.w/2, 0, 2*Math.PI);
    ctx.closePath();
  }
}

class OutputLayer extends InputLayer {
  constructor(name, n_nodes, fill) {
    super(name, n_nodes, fill);
    this.fillStyle = "#F99";
    this.bbox = new BBox(0.45, 0.8, 0.1, 0.1);
  }
}

class Model {
  constructor(name, context) {
    this.layers = [];
    this.name = name;
    this.context = context;
    this.hover = -1;
    this.grabbed = false;
    this.grab_offset = new Vec2(0,0);
    this.editing = -1;
    this.layers.push(new InputLayer("Input", 1, false));
    this.layers.push(new OutputLayer("Output", 1, false));
  }

  appendLayer(name, n_nodes) {
    for(var l in this.layers) {
      if(this.layers[l].name === name) {
        let words = this.layers[l].name.split(" ");
        let num = parseInt(words[words.length-1]);

        if(isNaN(num)) {
          name += " 1";
        } else {
          name = words.slice(0,-1).join(" ") + " " + (num+1);
        }
      }
    }
    let layer = new Layer(name, n_nodes, false);
    this.layers.splice(-1, 0, layer);
    this.edit(this.layers.length - 2);

    return layer;
  }

  draw() {
    if(!this.context) {
      return;
    }

    this.context.clearRect(0, 0, this.context.canvas.clientWidth, this.context.canvas.clientHeight);

    for(var l = 0; l < this.layers.length - 1; l++) {
      this.layers[l].drawCurveTo(this.layers[l+1], this.context);
    }
    for(var l2 in this.layers) {
      this.layers[l2].draw(this.context);
    }
  }

  setHover(idx) {
    this.hover = idx;
    this.layers[idx].setHover();
  }

  get isHover() {
    return this.hover !== -1;
  }

  get hoverID() {
    return this.hover;
  }

  removeCurrLayer() {
    if(this.hover === this.editing && this.hover !== -1 && this.hover !== 0 && this.hover !== this.layers.length-1) {
      this.layers.splice(this.hover, 1);
    }
  }

  clearEdit() {
    if(this.editing !== -1) {
      this.layers[this.editing].edit = false;
      this.editing = -1;
    }
  }

  edit(idx) {
    this.clearEdit();
    if(idx !== 0 && idx !== this.layers.length-1) {
      this.editing = idx;
      this.layers[idx].edit = true;
      Edit(this.layers[idx]);
    }
  }

  clearHover() {
    if(this.hover !== -1) {
      this.layers[this.hover].clearHover();
    }
    this.hover = -1;
  }

  grab(p) {
    if(this.hover !== -1) {
      this.grabbed = true;
      this.grab_offset.x = p.x - this.layers[this.hover].bbox.x;
      this.grab_offset.y = p.y - this.layers[this.hover].bbox.y;

      this.edit(this.hover);
    }
  }

  move(p) {
    if(this.hover !== -1) {
      this.layers[this.hover].bbox.x = p.x - this.grab_offset.x;
      this.layers[this.hover].bbox.y = p.y - this.grab_offset.y;
    }
  }

  get isGrab() {
    return this.grabbed;
  }

  release() {
    this.grabbed = false;
  }
}

function getNormMouse(elem, e) {
  let rect = elem.getBoundingClientRect();
  let p = new Vec2((e.clientX - rect.left) / elem.clientWidth,
                   (e.clientY - rect.top) / elem.clientHeight);

  return p;
}

function canvasMouseMove(e) {
  let p = getNormMouse(this, e);

  if(curr_model.isGrab) {
    console.log("grab move");
    curr_model.move(p);
    curr_model.draw();
    return;
  }

  curr_model.clearHover();

  let hover = false;
  for(var l in curr_model.layers) {
    if(curr_model.layers[l].bbox.contains(p)) {
      curr_model.setHover(l);
      hover = true;
      break;
    }
  }

  if(hover) {
    this.style.cursor = "pointer";
  } else {
    this.style.cursor = "default";
  }

  curr_model.draw();
}

function canvasMouseDown(e) {
  let p = getNormMouse(this, e);

  if(curr_model.isHover) {
    console.log("grab");
    curr_model.grab(p);
  }
  if(!curr_model.isHover || (curr_model.hoverID === 0 || curr_model.hoverID === curr_model.layers.length-1)) {
    document.getElementById("edit-tab").style.display = "none";
    curr_model.clearEdit();
  }

  curr_model.draw();
}

function canvasMouseUp(e) {
  curr_model.release();
  curr_model.draw();
}

function canvasMouseOut(e) {
  curr_model.release();
  curr_model.clearHover();
  curr_model.draw();
}

var curr_model;

function Begin(model_in) {
  let context = getContext("canvas");

  let layers = document.getElementById("horizontal-list").children;
  for(var l = 0; l < layers.length; l++) {
    let context_layer = getContext(layers[l].children[0].id);
    (new Layer(layers[l].dataset.name, 0, true)).draw(context_layer);
  }

  if(context) {
    context.canvas.onmousemove = canvasMouseMove;
    context.canvas.onmousedown = canvasMouseDown;
    context.canvas.onmouseup = canvasMouseUp;
    context.canvas.onmouseout = canvasMouseOut;
  }

  var model = model_in;
  if(!model) {
    model = new Model("Model1", context);
    //model.appendLayer("Layer2", 10);
  }

  curr_model = model;
  curr_model.context = context;
  model.draw();

  //onResize();
  //window.onresize = onResize;

  document.getElementById("epochs").oninput = function() {
    let v = parseInt(this.value);
    let invalid = document.getElementById("invalid_epochs");
    if(isNaN(v) || v < 1) {
      invalid.style.display = "block";
    } else {
      invalid.style.display = "none";
    }
  }

  document.getElementById("test").disabled = true;

  document.onkeydown = canvasKeyPress;
}

function dragLayer(e) {
  e.dataTransfer.setData("name", e.target.dataset.name);
  e.dataTransfer.setData("activation", e.target.dataset.activation);
}

function canvasAllowDrop(e) {
  e.preventDefault();
}

function canvasDrop(e) {
  e.preventDefault();

  let p = getNormMouse(curr_model.context.canvas, e);

  let name = e.dataTransfer.getData("name");
  let layer = curr_model.appendLayer(name + " 1", 10);
  layer.activation = e.dataTransfer.getData("activation");

  layer.bbox.x = p.x - layer.bbox.w/2;
  layer.bbox.y = p.y - layer.bbox.h/2;
}
/*
function onResize() {
  let canvas = document.getElementById("canvas");
  let canvas_wrap = document.getElementById("canvas-wrap");

  canvas.width = canvas_wrap.offsetWidth;
  curr_model.draw();
}*/

function Edit(layer) {
  document.getElementById("edit-tab").style.display = "block";
  let num_nodes = document.getElementById("num_nodes");
  let invalid_value = document.getElementById("invalid_nnodes");
  let title = document.getElementById("edit-title");
  title.value = layer.name;
  num_nodes.value = layer.n_nodes;

  num_nodes.oninput = function() {
    let val = parseInt(this.value);
    if(isNaN(val) || val <= 0) {
      invalid_value.style.display = "block";
    } else {
      invalid_value.style.display = "none";
    }
    layer.n_nodes = parseInt(this.value);
  }

  title.oninput = function() {
    let n = this.value;

    title.innerHTML = n;
    layer.name = n;
    curr_model.draw();
  }
}

function canvasKeyPress(e) {
  if(e.keyCode === 46 || e.keyCode === 8) {
    curr_model.removeCurrLayer();
  }
}

class Building extends Component {
  componentDidMount() {
    Begin(this.props.getModel());
    this.props.setModel(curr_model);

    setInterval(function() {
      var container = document.getElementById("container");
      var visor = document.getElementById("tfjs-visor-container");

      if(visor && visor.children[0].dataset.isopen) {
        container.style.justifyContent = "left";
      } else {
        container.style.justifyContent = "center";
      }
    }, 500);
  }

  render() {
    return (
      <div id="container">
        <button id="showvisor" onClick={this.props.showVisor}>Show Graphs</button>
        <div id="menu-outer">
          <h3 className="layers-title">Layers</h3>
          <div className="table">
            <ul id="horizontal-list">
              <li draggable="true" onDragStart={dragLayer} data-name="Sigmoid" data-activation="sigmoid">
                <canvas id="sigmoid_canvas" width="150" height="30"></canvas>
              </li>
              <li draggable="true" onDragStart={dragLayer} data-name="ReLu" data-activation="relu">
                <canvas id="relu_canvas" width="150" height="30"></canvas>
              </li>
              <li draggable="true" onDragStart={dragLayer} data-name="Tanh" data-activation="tanh">
                <canvas id="tanh_canvas" width="150" height="30"></canvas>
              </li>
              <li draggable="true" onDragStart={dragLayer} data-name="Softsign" data-activation="softsign">
                <canvas id="softsign_canvas" width="150" height="30"></canvas>
              </li>
            </ul>
          </div>
          <div className="left-break"></div>
          <b>Upload Data</b>
          <input className="file-input" type="file" id="train_f"></input>
          <div className="left-break"></div>
          <b>Number of Epochs</b>
          <input className="form-input" type="text" id="epochs" defaultValue="32"></input>
          <div id="invalid_epochs" style={{display: "none"}}>Please enter an integer greater than 0</div>
          <button id="train" onClick={this.props.train}>TRAIN</button>
          <div className="left-break"></div>
          <button id="test" onClick={this.props.test}>TEST</button>
          <ol id="error-table"></ol>
        </div>
        <div id="canvas-wrap">
          <canvas id="canvas" width="800" height="800" onDrop={canvasDrop} onDragOver={canvasAllowDrop}>
            <div className="no-canvas">Whoops! It looks like canvas isn't supported. Please upgrade to a newer browser.</div>
          </canvas>
          <div id="edit-tab">
            <b>Name</b><br></br>
            <input type="text" id="edit-title" style={{width: "auto"}}></input>
            <b>Number of Nodes</b><br></br>
            <input type="text" name="num_nodes" id="num_nodes"></input>
            <div id="invalid_nnodes" style={{display: "none"}}>Please enter an integer greater than 0</div>
          </div>
        </div>
      </div>
    );
  }

}

export default Building;
