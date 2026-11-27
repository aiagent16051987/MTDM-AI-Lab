import assert from "node:assert/strict";
import {createPID,dcMotorStep,integrateRigidBody2D,trapezoidalTrajectory} from "../robotics-advanced.mjs";
const pid=createPID({kp:3,ki:1,kd:.1,min:-2,max:2});const first=pid.update(1,0,.1);assert.equal(first.output,2);assert.equal(first.saturated,true);assert.ok(Number.isFinite(pid.update(1,.5,.1).output));pid.reset();assert.equal(pid.update(0,0,.1).output,0);
const motor=dcMotorStep({current:0,omega:0},12);assert.ok(motor.current>0&&motor.omega>0);assert.throws(()=>dcMotorStep({current:0,omega:0},12,{dt:0}),RangeError);
const body=integrateRigidBody2D({x:0,y:0,theta:0,vx:0,vy:0,omega:0},{fx:2,fy:0,torque:1},{mass:2,inertia:1,dt:.1});assert.ok(Math.abs(body.x-.005)<1e-12&&Math.abs(body.vx-.1)<1e-12&&Math.abs(body.omega-.1)<1e-12);
const path=trapezoidalTrajectory({distance:10,maxVelocity:2,maxAcceleration:1,dt:.01});assert.equal(path.profile,"trapezoidal");assert.equal(path.points.at(-1).position,10);assert.equal(path.points.at(-1).velocity,0);
const tri=trapezoidalTrajectory({distance:.1,maxVelocity:10,maxAcceleration:2,dt:.01});assert.equal(tri.profile,"triangular");assert.ok(tri.peakVelocity<10);assert.throws(()=>trapezoidalTrajectory({distance:1,maxVelocity:0,maxAcceleration:1,dt:.1}),RangeError);
console.log("Robotics advanced tests passed: PID saturation/anti-windup, DC motor state, rigid-body integration, triangular/trapezoidal trajectory.");
