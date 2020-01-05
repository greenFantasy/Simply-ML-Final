import json
import numpy as np

features = ["f1", "f2", "f3", "f4"];
N = 1000


X = np.random.rand(N, len(features) - 1);
y = np.random.rand(N, 1);

open("gen.json", "w").write(json.dumps({ "X": X.tolist(), "y": y.tolist(), "features": features }))
