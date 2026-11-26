# Verified source template: differential drive kinematics

Parameters: leftWheelAngularSpeed [rad/s], rightWheelAngularSpeed [rad/s], wheelRadius [m], wheelBase [m].
Outputs: linearVelocity = wheelRadius * (leftWheelAngularSpeed + rightWheelAngularSpeed) / 2 [m/s]; angularVelocity = wheelRadius * (rightWheelAngularSpeed - leftWheelAngularSpeed) / wheelBase [rad/s].
Assumptions: equal wheel radii, ideal planar rolling, no wheel slip, rigid track width, wheel speeds are angular rates.
This is a kinematic mapping only, not a dynamics, localization or safety model.
