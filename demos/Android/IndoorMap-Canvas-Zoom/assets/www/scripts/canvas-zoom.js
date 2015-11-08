/*
=================================
canvas-zoom - v0.1
http://github.com/licaomeng/canvas-zoom

(c) 2015 Caomeng LI
This code may be freely distributed under the Apache License
=================================
 */

(function () {
    var root = this; // global object
    var CanvasZoom = function (options) {
        if (!options || !options.canvas) {
            throw 'CanvasZoom constructor: missing arguments canvas';
        }

        this.canvas = options.canvas;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.context = this.canvas.getContext('2d');

        this.desktop = options.desktop || false; // non touch events

        this.scaleAdaption = 1;

        var indoormap = document.getElementById("indoormap");
        var pageWidth = parseInt(indoormap.getAttribute("width"));
        var pageHeight = parseInt(indoormap.getAttribute("height"));
        currentWidth = document.documentElement.clientWidth;
        currentHeight = document.documentElement.clientHeight;

        var offsetX = 0;
        var offsetY = 0;
        if (pageWidth < pageHeight) {//canvas.width < canvas.height
            this.scaleAdaption = currentHeight / pageHeight;
            if (pageWidth * this.scaleAdaption > currentWidth) {
                this.scaleAdaption = this.scaleAdaption * (currentWidth / (this.scaleAdaption * pageWidth));
            }
        } else {//canvas.width >= canvas.height
            this.scaleAdaption = currentWidth / pageWidth;
            if (pageHeight * this.scaleAdaption > currentHeight) {
                this.scaleAdaption = this.scaleAdaption * (currentHeight / (this.scaleAdaption * pageHeight));
            }
        }

        indoormap.setAttribute("width", pageWidth * this.scaleAdaption);
        indoormap.setAttribute("height", pageHeight * this.scaleAdaption);

        this.positionAdaption = {
            x: (parseInt(currentWidth) - parseInt(indoormap.getAttribute("width"))) / 2,
            y: (parseInt(currentHeight) - parseInt(indoormap.getAttribute("height"))) / 2
        };

        indoormap.setAttribute("width", currentWidth);
        indoormap.setAttribute("height", currentHeight);

        this.position = {
            x: 0,
            y: 0
        };

        this.scale = {
            x: 1,
            y: 1
        };

        this.focusPointer = {
            x: 0,
            y: 0
        }

        this.lastZoomScale = null;
        this.lastX = null;
        this.lastY = null;

        this.mdown = false; // desktop drag

        this.init = false;
        this.checkRequestAnimationFrame();
        requestAnimationFrame(this.animate.bind(this));

        this.setEventListeners();
    };

    CanvasZoom.prototype = {
        animate: function () {
            // set scale such as image cover all the canvas
            if (!this.init) {
                var scaleRatio = null;
                if (this.canvas.clientWidth > this.canvas.clientHeight) {
                    scaleRatio = this.scale.x;
                } else {
                    scaleRatio = this.scale.y;
                }
                this.scale.x = scaleRatio;
                this.scale.y = scaleRatio;
                this.init = true;
            }
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            // indoor map drawing function
            DrawMapInfo(this.scale.x * this.scaleAdaption, this.scale.y * this.scaleAdaption, this.position.x + this.positionAdaption.x, this.position.y + this.positionAdaption.y);
            requestAnimationFrame(this.animate.bind(this));
        },

        gesturePinchZoom: function (event) {
            var zoom = false;
            if (event.targetTouches.length >= 2) {
                var p1 = event.targetTouches[0];
                var p2 = event.targetTouches[1];
                this.focusPointer.x = (p1.pageX + p2.pageX) / 2;
                this.focusPointer.y = (p1.pageY + p2.pageY) / 2;
                var zoomScale = Math.sqrt(Math.pow(p2.pageX - p1.pageX, 2) + Math.pow(p2.pageY - p1.pageY, 2)); // euclidian
                if (this.lastZoomScale) {
                    zoom = zoomScale - this.lastZoomScale;
                }
                this.lastZoomScale = zoomScale;
            }
            return zoom;
        },

        doZoom: function (zoom) {
            if (!zoom)
                return;
            // new scale
            var currentScale = this.scale.x;
            var newScale = this.scale.x + zoom / 400;

            if (newScale > 1) {
                if (newScale > 2.5) {
                    newScale = 2.5;
                } else {
                    newScale = this.scale.x + zoom / 400;
                }
            } else {
                newScale = 1;
            }
            this.scale.x = newScale;
            this.scale.y = newScale;

            var deltaScale = newScale - currentScale;
            var currentWidth = (this.canvas.width * this.scale.x);
            var currentHeight = (this.canvas.height * this.scale.y);
            var deltaWidth = this.canvas.width * deltaScale;
            var deltaHeight = this.canvas.height * deltaScale;
            var canvasmiddleX = this.focusPointer.x;
            var canvasmiddleY = this.focusPointer.y;
            var xonmap = (-this.position.x) + canvasmiddleX;
            var yonmap = (-this.position.y) + canvasmiddleY;
            var coefX = -xonmap / (currentWidth);
            var coefY = -yonmap / (currentHeight);
            var newPosX = this.position.x + deltaWidth * coefX;
            var newPosY = this.position.y + deltaHeight * coefY;
            // edges cases
            var newWidth = currentWidth + deltaWidth;
            var newHeight = currentHeight + deltaHeight;
            if (newWidth < this.canvas.clientWidth)
                return;
            if (newPosX > 0) {
                newPosX = 0;
            }
            if (newPosX + newWidth < this.canvas.clientWidth) {
                newPosX = this.canvas.clientWidth - newWidth;
            }

            if (newHeight < this.canvas.clientHeight)
                return;
            if (newPosY > 0) {
                newPosY = 0;
            }
            if (newPosY + newHeight < this.canvas.clientHeight) {
                newPosY = this.canvas.clientHeight - newHeight;
            }

            // finally affectations
            this.scale.x = newScale;
            this.scale.y = newScale;
            this.position.x = newPosX;
            this.position.y = newPosY;
        },

        doMove: function (relativeX, relativeY) {
            if (this.lastX && this.lastY) {
                var deltaX = relativeX - this.lastX;
                var deltaY = relativeY - this.lastY;

                var currentWidth = (this.canvas.clientWidth * this.scale.x);
                var currentHeight = (this.canvas.clientHeight * this.scale.y);

                this.position.x += deltaX;
                this.position.y += deltaY;

                // edge cases
                if (this.position.x > 0) {
                    this.position.x = 0;
                } else if (this.position.x + currentWidth < this.canvas.clientWidth) {
                    this.position.x = this.canvas.width - currentWidth;
                }
                if (this.position.y > 0) {
                    this.position.y = 0;
                } else if (this.position.y + currentHeight < this.canvas.clientHeight) {
                    this.position.y = this.canvas.height - currentHeight;
                }
            }
            this.lastX = relativeX;
            this.lastY = relativeY;
        },

        setEventListeners: function () {
            // touch
            this.canvas.addEventListener('touchstart', function (e) {
                this.lastX = null;
                this.lastY = null;
                this.lastZoomScale = null;
            }.bind(this));

            this.canvas.addEventListener('touchmove', function (e) {
                e.preventDefault();

                if (e.targetTouches.length == 2) { // pinch
                    this.doZoom(this.gesturePinchZoom(e));
                } else if (e.targetTouches.length == 1) {// move
                    var relativeX = e.targetTouches[0].pageX - this.canvas.getBoundingClientRect().left;
                    var relativeY = e.targetTouches[0].pageY - this.canvas.getBoundingClientRect().top;

                    this.doMove(relativeX, relativeY);
                }
            }.bind(this));

            if (this.desktop) {
                // keyboard+mouse
                window.addEventListener('keyup', function (e) {
                    if (e.keyCode == 187 || e.keyCode == 61) { // +
                        this.doZoom(15);
                    } else if (e.keyCode == 54) {// -
                        this.doZoom(-15);
                    }
                }.bind(this));

                window.addEventListener('mousedown', function (e) {
                    this.mdown = true;
                    this.lastX = null;
                    this.lastY = null;
                }.bind(this));

                window.addEventListener('mouseup', function (e) {
                    this.mdown = false;
                }.bind(this));

                window.addEventListener('mousemove', function (e) {
                    var relativeX = e.pageX - this.canvas.getBoundingClientRect().left;
                    var relativeY = e.pageY - this.canvas.getBoundingClientRect().top;

                    if (e.target == this.canvas && this.mdown) {
                        this.doMove(relativeX, relativeY);
                    }

                    if (relativeX <= 0 || relativeX >= this.canvas.clientWidth || relativeY <= 0 || relativeY >= this.canvas.clientHeight) {
                        this.mdown = false;
                    }
                }.bind(this));
            }
        },

        checkRequestAnimationFrame: function () {
            var lastTime = 0;
            var vendors = ['ms', 'moz', 'webkit', 'o'];
            for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
                window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
                window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame']
						|| window[vendors[x] + 'CancelRequestAnimationFrame'];
            }

            if (!window.requestAnimationFrame) {
                window.requestAnimationFrame = function (callback, element) {
                    var currTime = new Date().getTime();
                    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                    var id = window.setTimeout(function () {
                        callback(currTime + timeToCall);
                    }, timeToCall);
                    lastTime = currTime + timeToCall;
                    return id;
                };
            }

            if (!window.cancelAnimationFrame) {
                window.cancelAnimationFrame = function (id) {
                    clearTimeout(id);
                };
            }
        }
    };

    root.CanvasZoom = CanvasZoom;
}).call(this);