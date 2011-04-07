// augment Sylvester some
Matrix.Translation = function (v)
{
  if (v.elements.length == 2) {
    var r = Matrix.I(3);
    r.elements[2][0] = v.elements[0];
    r.elements[2][1] = v.elements[1];
    return r;
  }

  if (v.elements.length == 3) {
    var r = Matrix.I(4);
    r.elements[0][3] = v.elements[0];
    r.elements[1][3] = v.elements[1];
    r.elements[2][3] = v.elements[2];
    return r;
  }

  throw "Invalid length for Translation";
}

Matrix.prototype.flatten = function ()
{
//    var result = [];
   if (this.elements.length == 0)
        return [];

	var stride = this.elements[0].length;
	var length = stride * this.elements.length;
	var result = new Float32Array(length);
	
	for (var j = 0; j < this.elements[0].length; j++)
		for (var i = 0; i < this.elements.length; i++)
			result[j * stride + i] = (this.elements[i][j]);

    return result;
}

Matrix.prototype.ensure4x4 = function()
{
    if (this.elements.length == 4 &&
        this.elements[0].length == 4)
        return this;

    if (this.elements.length > 4 ||
        this.elements[0].length > 4)
        return null;

    for (var i = 0; i < this.elements.length; i++) {
        for (var j = this.elements[i].length; j < 4; j++) {
            if (i == j)
                this.elements[i].push(1);
            else
                this.elements[i].push(0);
        }
    }

    for (var i = this.elements.length; i < 4; i++) {
        if (i == 0)
            this.elements.push([1, 0, 0, 0]);
        else if (i == 1)
            this.elements.push([0, 1, 0, 0]);
        else if (i == 2)
            this.elements.push([0, 0, 1, 0]);
        else if (i == 3)
            this.elements.push([0, 0, 0, 1]);
    }

    return this;
};

Matrix.prototype.make3x3 = function()
{
    if (this.elements.length != 4 ||
        this.elements[0].length != 4)
        return null;

    return Matrix.create([[this.elements[0][0], this.elements[0][1], this.elements[0][2]],
                          [this.elements[1][0], this.elements[1][1], this.elements[1][2]],
                          [this.elements[2][0], this.elements[2][1], this.elements[2][2]]]);
};

Matrix.prototype.makeModeMatrix = function() {
	var used = [false, false, false, false];
	var newM = [];
	for (var i in this.elements) {
		var biggest = 0;
		var biggestJ = 0;
		for (var j in this.elements[i]) {
			if (Math.abs(this.elements[i][j]) > biggest) {
				if (!used[j]) {
					used[j] = true;
					biggest = Math.abs(this.elements[i][j]);
					biggestJ = j;
				}
			}
		}
		var newRow = [];
		for (var j in this.elements[i]) {
			if (j == biggestJ) {
				newRow.push((this.elements[i][j] > 0)? 1 : -1)
			} else {
				newRow.push(0);
			}
		}
		newM.push(newRow);
	}

	var result = $M(newM);
	console.log(result.inspect());
	return result;
}

Vector.prototype.to4D = function() {
	if (this.dimensions() == 4) {
		return this;
	} else if (this.dimensions() == 3) { 
		return $V([this.elements[0], this.elements[1], this.elements[2], 1.0]);
	} else if (this.dimensions() == 2) { 
		return $V([this.elements[0], this.elements[1], 0.0, 1.0]);
	}
}

Vector.prototype.xyz = function()
{
	return $V([this.elements[0],this.elements[1],this.elements[2]])
}

Vector.prototype.xy = function()
{
	return $V([this.elements[0],this.elements[1]])
}

Vector.prototype.xz = function()
{
	return $V([this.elements[0],this.elements[2]])
}

Vector.prototype.yz = function()
{
	return $V([this.elements[1],this.elements[2]])
}


Vector.prototype.flatten = function ()
{
    return this.elements;
};

function mht(m) {
    var s = "";
    if (m.length == 16) {
        for (var i = 0; i < 4; i++) {
            s += "<span style='font-family: monospace'>[" + m[i*4+0].toFixed(4) + "," + m[i*4+1].toFixed(4) + "," + m[i*4+2].toFixed(4) + "," + m[i*4+3].toFixed(4) + "]</span><br>";
        }
    } else if (m.length == 9) {
        for (var i = 0; i < 3; i++) {
            s += "<span style='font-family: monospace'>[" + m[i*3+0].toFixed(4) + "," + m[i*3+1].toFixed(4) + "," + m[i*3+2].toFixed(4) + "]</font><br>";
        }
    } else {
        return m.toString();
    }
    return s;
}

Matrix.LookAt = function(eye, center, up)
{
	if (!up)
   	up = $V([0, 1, 0]);

    var z = eye.subtract(center).toUnitVector();
    var x = up.cross(z).toUnitVector();
    var y = z.cross(x).toUnitVector();

    var m = $M([[x.e(1), x.e(2), x.e(3), 0],
                [y.e(1), y.e(2), y.e(3), 0],
                [z.e(1), z.e(2), z.e(3), 0],
                [     0,      0,      0, 1]]);

/*    var t = $M([[1, 0, 0, -eye.elements[0]],
                [0, 1, 0, -eye.elements[1]],
                [0, 0, 1, -eye.elements[2]],
                [0, 0, 0, 1]]);*/
    return m;
}

Matrix.prototype.AlignYAxis = function(y, alpha) {
	//	var x = $V([this.elements[0][0], this.elements[1][0], this.elements[2][0]]);
	var y = $V([y.elements[0] * alpha + this.elements[0][1] * (1 - alpha), y.elements[1] * alpha + this.elements[1][1] * (1 - alpha), y.elements[2] * alpha + this.elements[2][1] * (1 - alpha)]).toUnitVector();
//	console.log(y.inspect());
	var z = $V([this.elements[0][2], this.elements[1][2], this.elements[2][2]]);
	var x = z.cross(y).toUnitVector().x(-1);
	z = x.cross(y).toUnitVector();
	return $M([x.elements,y.elements,z.elements]).ensure4x4().transpose();
}

Matrix.LookAtY = function(targetY, back)
{
	if (!back)
   	back = $V([0, 0, 1]);

    var y = targetY.x(-1).toUnitVector();
    var x = back.cross(y).toUnitVector();
    var z = y.cross(x).toUnitVector();

	if (y.elements[1] < 0) {
	    var m = $M([[x.e(1), x.e(2), x.e(3), 0],
	                [-y.e(1), -y.e(2), -y.e(3), 0],
	                [z.e(1), z.e(2), z.e(3), 0],
	                [     0,      0,      0, 1]]);
	} else {
	    var m = $M([[-x.e(1), -x.e(2), -x.e(3), 0],
	                [-y.e(1), -y.e(2), -y.e(3), 0],
	                [-z.e(1), -z.e(2), -z.e(3), 0],
	                [     0,      0,      0, 1]]);		
	}

    return m;
}


//
// gluPerspective
//
Matrix.Perspective = function(fovy, aspect, znear, zfar)
{
    var ymax = znear * Math.tan(fovy * Math.PI / 360.0);
    var ymin = -ymax;
    var xmin = ymin * aspect;
    var xmax = ymax * aspect;

    return Matrix.Frustum(xmin, xmax, ymin, ymax, znear, zfar);
}

//
// glFrustum
//
Matrix.Frustum = function(left, right,
                     bottom, top,
                     znear, zfar)
{
    var X = 2*znear/(right-left);
    var Y = 2*znear/(top-bottom);
    var A = (right+left)/(right-left);
    var B = (top+bottom)/(top-bottom);
    var C = -(zfar+znear)/(zfar-znear);
    var D = -2*zfar*znear/(zfar-znear);

    return $M([[X, 0, A, 0],
               [0, Y, B, 0],
               [0, 0, C, D],
               [0, 0, -1, 0]]);
}

//
// glOrtho
//
Matrix.Ortho = function(left, right, bottom, top, znear, zfar)
{
    var tx = - (right + left) / (right - left);
    var ty = - (top + bottom) / (top - bottom);
    var tz = - (zfar + znear) / (zfar - znear);

    return $M([[2 / (right - left), 0, 0, tx],
           [0, 2 / (top - bottom), 0, ty],
           [0, 0, -2 / (zfar - znear), tz],
           [0, 0, 0, 1]]);
}
