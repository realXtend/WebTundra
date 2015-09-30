
define([
        "lib/three",
    ], function(THREE) {

var ThreeJsCombinedCamera = Class.$extend(
{
    __init__ : function(viewSize, aspectRatio, verticalFov, nearPlane, farPlane)
    {
        this._viewSize = viewSize;
        Object.defineProperties(this, {
            viewSize : {
                get : function () {
                    return this._viewSize;
                },
                set : function (value) {
                    this._setViewSize(value);
                }
            }
        });

        this._aspect = aspectRatio;
        Object.defineProperties(this, {
            aspect : {
                get : function () {
                    return this._aspect;
                },
                set : function (value) {
                    this._setViewSize(undefined, value);
                }
            }
        });

        this._fov = verticalFov;
        Object.defineProperties(this, {
            fov : {
                get : function () {
                    return this._fov;
                },
                set : function (value) {
                    this._setFov(value);
                }
            }
        });

        this._near = nearPlane;
        Object.defineProperties(this, {
            near : {
                get : function () {
                    return this._near;
                },
                set : function (value) {
                    this._setNearFar(value);
                }
            }
        });

        this._far = farPlane;
        Object.defineProperties(this, {
            far : {
                get : function () {
                    return this._far;
                },
                set : function (value) {
                    this._setNearFar(undefined, value);
                }
            }
        });

        this.left = -0.5 * (aspectRatio * viewSize);
        this.right = 0.5 * (aspectRatio * viewSize);
        this.top = 0.5 * viewSize
        this.bottom = -0.5 * viewSize;

        this.cameraP = new THREE.PerspectiveCamera(verticalFov, aspectRatio, nearPlane, farPlane);
        this.cameraO = new THREE.OrthographicCamera(this.left, this.right, this.top, this.bottom, 1e-6, 1e10);

        this.cameraP._combinedCamera = this;
        this.cameraO._combinedCamera = this;

        this.orthographic = false;
        this.toPerspective();

    },

    _setViewSize : function(viewSize, aspect)
    {
        viewSize = viewSize || this.viewSize;
        aspect = aspect || this.aspect;

        this._viewSize = viewSize;
        this._aspect = aspect;

        this.left = -0.5 * (aspect * viewSize);
        this.right = 0.5 * (aspect * viewSize);
        this.top = 0.5 * viewSize;
        this.bottom = -0.5 * viewSize;
        this.updateOrthographic();
    },

    _setFov : function(fov)
    {
        this._fov = fov;

        this.updatePerspective();
    },

    _setNearFar : function(near, far)
    {
        near = near || this.near;
        far = far || this.far;

        this._near = near;
        this._far = far;

        this.updatePerspective();
        this.updateOrthographic();
    },

    updatePerspective : function()
    {
        this.cameraP.fov = this.fov;
        this.cameraP.aspect = this.aspect;
        this.cameraP.near = this.near;
        this.cameraP.far = this.far;

        this.cameraP.updateProjectionMatrix();
    },

    toPerspective : function(emit)
    {
        this.updatePerspective();

        this.currentCamera = this.cameraP;
        this.orthographic = false;

        if (emit === true && typeof this.onCameraChanged === "function")
            this.onCameraChanged(this.currentCamera);
    },

    updateOrthographic : function()
    {
        this.cameraO.near = 1e-6;
        this.cameraO.far = 1e10;

        this.cameraO.left = this.left;
        this.cameraO.right = this.right;
        this.cameraO.top = this.top;
        this.cameraO.bottom = this.bottom;

        this.cameraO.updateProjectionMatrix();
    },

    toOrthographic : function(emit)
    {
        this.updateOrthographic();

        this.currentCamera = this.cameraO;
        this.orthographic = true;

        if (emit === true && typeof this.onCameraChanged === "function")
            this.onCameraChanged(this.currentCamera);
    }
});

return ThreeJsCombinedCamera;

});