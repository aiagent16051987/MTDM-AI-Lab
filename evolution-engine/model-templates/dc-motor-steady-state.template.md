# Verified source template: DC motor steady state

Parameters: voltage [V], resistance [ohm], torqueConstant [N m/A], backEmfConstant [V s/rad], loadTorque [N m].
Outputs: armatureCurrent = loadTorque / torqueConstant [A]; angularSpeed = (voltage - resistance * armatureCurrent) / backEmfConstant [rad/s].
Assumptions: permanent-magnet/constant-flux motor, steady state, ideal armature, no friction, no inductance, no saturation, no brush drop, no thermal or controller dynamics.
The source template defines equations and units only; it is not a validated hardware model.
