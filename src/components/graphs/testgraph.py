import matplotlib.pyplot as plt, mpld3
fig = plt.figure()
plt.plot([3,1,4,1,5], 'ks-', mec='w', mew=5, ms=20)
x = mpld3.fig_to_html(fig, no_extras=False,template_type='general')
f = open("graph.js", "w+")
f.write("
/
")
