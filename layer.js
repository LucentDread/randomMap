class Layer {
	constructor(seed, size = 0, ctx = null, ctxSize = 0) {
		Layer.p = 1162261467
		Layer.a = 14348907
		Layer.b = this.a + 1 % 4
		Layer.c = 65531
		Layer.seed = (Layer.a * seed ** 2 + Layer.b * seed + Layer.c) % Layer.p
		Layer.size = size
		Layer.ctxSize = ctxSize
		Layer.ctx = ctx
	}

	static currentStep = 0
	static previousLayer = null

	generate() {
		Layer.steps = [
			new LayerIsland(Layer.seed, Layer.size),
			new LayerZoom(Layer.seed, Layer.previousLayer, true),
			new LayerAddIsland(Layer.seed, Layer.previousLayer),
			new LayerZoom(Layer.seed, Layer.previousLayer),
			new LayerAddIsland(Layer.seed, Layer.previousLayer),
			new LayerAddIsland(Layer.seed, Layer.previousLayer),
			new LayerAddIsland(Layer.seed, Layer.previousLayer),
			new LayerRemoveTooMuchWater(Layer.seed, Layer.previousLayer),
			new LayerAddTemperature(Layer.seed, Layer.previousLayer)
		]
		this.draw()
	}

	syncWait(ms) {
		const end = Date.now() + ms
		while (Date.now() < end) continue
	}

	draw() {
		console.log(Layer.previousLayer)
		Layer.previousLayer = (Layer.steps[Layer.currentStep]).generate()

		Layer.currentStep += 1
		setTimeout(() => {

			Layer.ctx.clearRect(0, 0, Layer.ctxSize, Layer.ctxSize)
			let tileSize = Layer.ctxSize / Layer.previousLayer.length
			for (let i = 0; i < Layer.previousLayer.length; i++) {
				for (let j = 0; j < Layer.previousLayer.length; j++) {
					let x = Layer.previousLayer.layer[i][j]
					if (x == 1) {
						Layer.ctx.fillStyle = "green";
					} else if (x == 2) {
						Layer.ctx.fillStyle = "orange";
					} else if (x == 3) {
						Layer.ctx.fillStyle = "darkgreen";
					} else if (x == 4) {
						Layer.ctx.fillStyle = "white";
					} else if (x == 5) {
						Layer.ctx.fillStyle = "yellow";
					} else if (x == 0) {
						Layer.ctx.fillStyle = "blue";
					} else {
						Layer.ctx.fillStyle = "darkblue";
					}
					Layer.ctx.fillRect(Math.ceil(i * tileSize), Math.ceil(j * tileSize), Math.ceil(tileSize), Math.ceil(tileSize));
				}
			}
		}, 300)
		if (Layer.currentStep < Layer.steps.length) window.requestAnimationFrame(this.draw)
	}

	static random(max) {
		let result = Layer.seed % max
		Layer.seed = (Layer.a * Layer.seed ** 2 + Layer.b * Layer.seed + Layer.c) % Layer.p
		return result
	}

	static randomElement(array) {
		return array[Layer.random(array.length)]
	}

}

class LayerIsland extends Layer {
	constructor(seed, size) {
		super(seed)
		this.layer = [...Array(size)].map(_ => Array(size).fill(0))
	}

	generate() {
		for (let i = 0; i < this.layer.length; i++) {
			for (let j = 0; j < this.layer.length; j++) {
				if (Layer.random(10) == 0) this.layer[i][j] = 1
			}
		}
		return this.layer
	}
}

class LayerZoom extends Layer {
	constructor(seed, prevLayer, fuzzy = false) {
		super(seed)
		this.layer = prevLayer
		this.fuzzy = fuzzy
	}

	generate() {
		let newSize = this.layer.length * 2
		let zoomedLayer = [...Array(newSize)].map(_ => Array(newSize).fill(0))
		for (let i = 0; i < this.layer.length; i++) {
			for (let j = 0; j < this.layer.length; j++) {
				let x = this.layer[i][j]

				zoomedLayer[2 * i][2 * j] = x
				let d2 = Layer.random(2)
				zoomedLayer[2 * i][2 * j + 1] = (j + 1 >= this.layer.length - 1 || d2 == 0) ? x : this.layer[i][j + 1]
				d2 = Layer.random(2)
				zoomedLayer[2 * i + 1][2 * j] = (i + 1 >= this.layer.length - 1 || d2 == 0) ? x : this.layer[i + 1][j]

				let a = x
				let b = (i + 1 < this.layer.length) ? this.layer[i + 1][j] : x
				let c = (j + 1 < this.layer.length) ? this.layer[i][j + 1] : x
				let d = (j + 1 < this.layer.length && i + 1 < this.layer.length) ? this.layer[i + 1][j + 1] : x
				let e = x
				if (!this.fuzzy) {
					if (b == c && c == d) e = b
					else if (a == b && a == c) e = a
					else if (a == b && a == d) e = a
					else if (a == c && a == d) e = a
					else if (a == b && c != d) e = a
					else if (a == c && b != d) e = a
					else if (a == d && b != c) e = a
					else if (b == c && a != d) e = b
					else if (b == d && a != c) e = b
					else if (c == d && a != b) e = c
					else {
						let choices = [a, b, c, d]
						e = choices[Layer.random(4)]
					}
				} else {
					e = Layer.randomElement([a, b, c, d])
				}
				zoomedLayer[2 * i + 1][2 * j + 1] = e
			}
		}
		this.layer = zoomedLayer
		return this.layer
	}
}

class LayerAddIsland extends Layer {
	constructor(seed, prevLayer) {
		super(seed)
		this.layer = prevLayer
	}

	generate() {
		let addLayer = structuredClone(this.layer)
		for (let i = 0; i < this.layer.length; i++) {
			for (let j = 0; j < this.layer.length; j++) {
				let x = this.layer[i][j]
				let i1 = this.layer[i - 1]?.[j]
				let i2 = this.layer[i + 1]?.[j]
				let j1 = this.layer[i]?.[j - 1]
				let j2 = this.layer[i]?.[j + 1]
				let landNeighbour = i1 || 0
				landNeighbour += i2 || 0
				landNeighbour += j1 || 0
				landNeighbour += j2 || 0
				let newLandProba = 0.6 - ((4 - landNeighbour) * 0.15)
				let newWaterProba = 0.6 - newLandProba
				let newNumber = x > 0 ? newWaterProba * 100 : newLandProba * 100
				for (let k = i - 1; k < i + 2; k++) {
					if (this.layer[k] == undefined) continue
					for (let l = j - 1; l < j + 2; l++) {
						if ((k == i && l == j) || (k != i && l != j)) continue
						let y = this.layer[k][l]
						if (isNaN(y)) continue
						if ((x > 0 && y > 0) || ((x < 1 && y < 1))) continue
						addLayer[k][l] = Layer.random(1000) < newNumber ? x : y
					}
				}
			}
		}
		this.layer = addLayer
		return this.layer
	}
}

class LayerRemoveTooMuchWater extends Layer {
	constructor(seed, prevLayer) {
		super(seed)
		this.layer = prevLayer
	}

	generate() {
		let addLayer = structuredClone(this.layer)
		for (let i = 0; i < this.layer.length; i++) {
			for (let j = 0; j < this.layer.length; j++) {
				let x = this.layer[i][j]
				let i1 = this.layer[i - 1]?.[j]
				let i2 = this.layer[i + 1]?.[j]
				let j1 = this.layer[i]?.[j - 1]
				let j2 = this.layer[i]?.[j + 1]
				let landNeighbour = i1 || 0
				landNeighbour += i2 || 0
				landNeighbour += j1 || 0
				landNeighbour += j2 || 0
				if (landNeighbour == 0) {
					addLayer[i][j] = Layer.random(2) == 0 ? 1 : x
				}
			}
		}
		this.layer = addLayer
		return this.layer
	}
}

class LayerAddTemperature extends Layer {
	constructor(seed, prevLayer) {
		super(seed)
		this.layer = prevLayer
	}

	generate() {
		let addLayer = structuredClone(this.layer)
		for (let i = 0; i < this.layer.length; i++) {
			for (let j = 0; j < this.layer.length; j++) {
				let x = this.layer[i][j]
				if (x != 1) continue
				let d6 = Layer.random(6)
				let temp = x
				switch (d6) {
					case 0:
						temp = 2
					case 1:
						temp = 4
					default:
						temp = 3
				}
				addLayer[i][j] = temp
			}
		}
		this.layer = addLayer
		return this.layer
	}
}