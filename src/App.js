import React, { Component } from 'react';
//import logo from './logo.svg';
import './App.css';
//import Tabs from './components/Tabs';
import Building from './components/building/Building';
import Background from './components/background/Background';
import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';
//import background from './background.png';
require('./App.css');

/**
 * Get the car data reduced to just the variables we are interested
 * and cleaned of missing data.
 */
function cleanData(data) {
  const features = data.features;
  const X_in = data.X;
  const y_in = data.y;

  let norm_data = {};
  norm_data.X = [];

  for(var j = 0; j < X_in[0].length; j++) {
    let max = -10000000;
    let min = 10000000;
    for(var i = 0; i < X_in.length; i++) {
      if(X_in[i][j] > max) {
        max = X_in[i][j];
      }
      if(X_in[i][j] < min) {
        min = X_in[i][j];
      }
    }
    for(var i2 = 0; i2 < X_in.length; i2++) {
      X_in[i2][j] = (X_in[i2][j] - min) / (max - min);
    }
    norm_data.X.push({ min: min, max: max });
  }
    
  let max = -10000000;
  let min = 10000000;
  for(var j2 = 0; j2 < y_in.length; j2++) {
    if(y_in[j2][0] > max) {
      max = y_in[j2][0];
    }
    if(y_in[j2][0] < min) {
      min = y_in[j2][0];
    }
  }
  for(var j3 = 0; j3 < y_in.length; j3++) {
   y_in[j3][0] = (y_in[j3][0] - min) / (max - min);
  }
  norm_data.y = { min: min, max: max };

  let train_X = [];
  let train_y = [];
  let test_X = [];
  let test_y = [];
  let split = 0.8;

  for(var i3 = 0; i3 < X_in.length; i3++) {
    if(Math.random() < split) {
      train_X.push(X_in[i3]);
      train_y.push(y_in[i3]);
    } else {
      test_X.push(X_in[i3]);
      test_y.push(y_in[i3]);
    }
  }
  

  return {trainX: train_X, trainy: train_y, testX: test_X, testy: test_y, features: features, norm_data: norm_data};
}

/**
 * Convert the input data to tensors that we can use for machine
 * learning. We will also do the important best practices of _shuffling_
 * the data and _normalizing_ the data
 * MPG on the y-axis.
 */
function convertToTensor(data, norm) {
  // Wrapping these calculations in a tidy will dispose any
  // intermediate tensors.

  return tf.tidy(() => {
    // Step 1. Shuffle the data
    //tf.util.shuffle(data);

    // Step 2. Convert data to Tensor
    const inputs = data.X;
    const labels = data.y;

    const inputTensor = tf.tensor2d(inputs, [inputs.length, inputs[0].length]);
    const labelTensor = tf.tensor2d(labels, [labels.length, labels[0].length]);
  
    return {
      inputs: inputTensor,
      labels: labelTensor,
    }
  });
}

async function trainModel(model, inputs, labels, features) {
  // Prepare the model for training.
  model.compile({
    optimizer: tf.train.adam(),
    loss: tf.losses.meanSquaredError,
    metrics: ['mse', 'acc'],
  });

  const batchSize = 32;
  const epochs = parseInt(document.getElementById("epochs").value);

  if(!isNaN(epochs) && epochs > 0) {
    return await model.fit(inputs, labels, {
      batchSize,
      epochs,
      shuffle: true,
      callbacks: tfvis.show.fitCallbacks(
        { name: 'Training Performance' },
        ['loss'],
        { height: 200 }
      )
    });
  }
}

async function testModel(model, inputData) {
  const [xs, preds] = tf.tidy(() => {
    const xs = tf.tensor2d(inputData.X, [inputData.X.length, inputData.X[0].length]);
    const preds = model.predict(xs);

    return [xs.arraySync(), preds.arraySync()];
  });
  
  let table = document.getElementById("error-table");
  table.style.display = "block";

  let ymax = inputData.norm_data.y.max;
  let ymin = inputData.norm_data.y.min;
 
  let ranges = [0.01, 0.05, 0.1, 0.2];
  
  let ranges_counts = []
  for(var k in ranges) {
    ranges_counts.push(0);
  }
  
  for(var p = 0; p < inputData.X.length; p++) {
    let y = ((ymax - ymin) * inputData.y[p][0] + ymin);
    let y_hat = ((ymax - ymin) * preds[p][0] + ymin);
    let error = Math.abs((y_hat - y) / y);
    console.log(error);
    
    for(var r  = 0; r < ranges.length; r++) {
      if(error < ranges[r]) {
        ranges_counts[r] += 1.0/inputData.X.length;
        break;
      }
    }
  }

  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }

  for(var j in ranges) {
    var e = document.createElement("LI");
    e.className = "error-table-li";
    var te = document.createTextNode("Less than " + ((100 * ranges[j]).toFixed(0)) + "%: " + (100 * ranges_counts[j]).toFixed(1) + "%");
    e.appendChild(te);
    table.appendChild(e);
  }

  let plots = [];

  for(var f = 0; f < inputData.X[0].length; f++) {
    let originalPoints = [];
    let predictedPoints = [];
    let max = inputData.norm_data.X[f].max;
    let min = inputData.norm_data.X[f].min;
    for(var i = 0; i < inputData.X.length; i++) {
      let y = ((ymax - ymin) * inputData.y[i][0] + ymin);
      let y_hat = ((ymax - ymin) * preds[i][0] + ymin);
      originalPoints.push({ x: ((max - min) * inputData.X[i][f] + min), y: y }); 
      predictedPoints.push({ x: ((max - min) * xs[i][f] + min), y: y_hat }); 
    }

    let plot = await tfvis.render.scatterplot(
      {name: 'Model Predictions vs Original for ' + inputData.features[f]},
      {values: [originalPoints, predictedPoints], series: ['original', 'predicted']},
      {
        xLabel: inputData.features[f],
        yLabel: inputData.features[inputData.features.length-1],
        height: 300
      }
    );
    plots.push(plot);
  }

  return plots;
}

async function train_tf(model, data) {
  document.getElementById("test").disabled = true;
  // Load and plot the original input data that we are going to train on.

  /*tfvis.render.scatterplot(
    {name: 'Horsepower v MPG'},
    {values},
    {
      xLabel: 'Horsepower',
      yLabel: 'MPG',
      height: 300
    }
  );*/

  let table = document.getElementById("error-table");
  table.style.display = "none";

  // Convert the data to a form we can use for training.
  const tensorData = convertToTensor(data);
  const {inputs, labels} = tensorData;

  // Train the model
  let res = await trainModel(model, inputs, labels, data.features);
  console.log(res);
  document.getElementById("test").disabled = false;
}

async function test_tf(model, data) {
  console.log("test_tf");
  return testModel(model, data);
}

class App extends Component {
  constructor(props) {
    super(props);

    this.setModel = this.setModel.bind(this);
    this.getModel = this.getModel.bind(this);
    this.TrainModel = this.TrainModel.bind(this);
    this.Test = this.Test.bind(this);
    this.Train = this.Train.bind(this);
    this.reader = new FileReader();
  }

  componentDidMount() {
    document.title = "Simply ML";
  }

  // Entry point for setup
  setModel(model) {
    this.model = model;
  }

  Build(in_size, out_size) {
    if(!this.model) {
      return;
    }
    this.tfmodel = tf.sequential();
    for(var l = 1; l < this.model.layers.length; l++) {
      let nodes = this.model.layers[l].n_nodes;
      if(l === this.model.layers.length-1) {
        nodes = out_size;
      }
      let data = { units: nodes, activation: this.model.layers[l].activation };
      if(l === 1) {
        data.inputShape = [in_size];
      }

      this.tfmodel.add(tf.layers.dense(data));
    }
  }

  getModel() {
    return this.model;
  }

  // Entry point for Training
  Train() {
    let f = document.getElementById("train_f").files[0];
    if(f) {
      this.reader.readAsText(f, "ASCII");
      this.reader.onload = this.TrainModel;
    }
  }

  async TrainModel(e) {
    let data = cleanData(JSON.parse(e.target.result));

    this.trainX = data.trainX;
    this.trainy = data.trainy;
    this.testX = data.testX;
    this.testy = data.testy;
    this.features = data.features;
    this.norm_data = data.norm_data;

    this.Build(this.trainX[0].length, this.trainy[0].length);
    this.showVisor();
    await train_tf(this.tfmodel, { X: this.trainX, y: this.trainy, features: this.features });
  }

  async Test() {
    if(this.test_plots) {
    /*  console.log(this.test_plots);
      for(var p in this.test_plots) {
        this.test_plots[p].close();
      }*/
    }
    this.showVisor();
    this.test_plots = await test_tf(this.tfmodel, { X: this.testX, y: this.testy, features: this.features, norm_data: this.norm_data });
  }

  showVisor() {
    tfvis.visor().open();
  }

  render() {
    return (
      <div>
        <Background />
        <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet"></link>
        <h1 className="main-title">Simply ML</h1>
        <Building showVisor={this.showVisor} test={this.Test} train={this.Train} getModel={this.getModel} setModel={this.setModel}/>
      </div>
    );
  }
}

export default App;
