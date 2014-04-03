define([
        "lib/classy",
        "lib/three",
    ], function(Class, THREE) {

var EasingCurve = Class.$extend(
{
    __init__ : function(p1, p2)
    {
        this.p0 = new THREE.Vector2(0, 0);
        this.p1 = p1 || new THREE.Vector2(0.0, 0.5);
        this.p2 = p2 || new THREE.Vector2(1.0, 0.5);
        this.p3 = new THREE.Vector2(1, 1);
    },

    /** 
        Get easing curve adjusted time.
        @param {Number} time Time in the range of [0,1].
        @return Easing curve time in the range of [0,1].
    */
    getTime : function(time)
    {
        time = Math.min(Math.max(time, 0.0), 1.0);

        var leftHalf = this.p0.clone().lerp(this.p1, time);
        var centerHalf = this.p1.clone().lerp(this.p2, time);
        var rightHalf = this.p2.clone().lerp(this.p3, time);

        leftHalf.lerp(centerHalf, time)
        centerHalf.lerp(rightHalf, time);
        return leftHalf.lerp(centerHalf, time).x;
    }
});

return EasingCurve;

}); // require js
