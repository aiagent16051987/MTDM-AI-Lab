# Verified source template: unloaded resistive divider

Parameters: inputVoltage [V], topResistance [ohm], bottomResistance [ohm].
Outputs: outputVoltage = inputVoltage * bottomResistance / (topResistance + bottomResistance) [V]; dividerCurrent = inputVoltage / (topResistance + bottomResistance) [A]; totalPower = inputVoltage^2 / (topResistance + bottomResistance) [W].
Assumptions: ideal source, two series resistors, no output load, constant resistance, no parasitic effects.
This is an ideal calculation, not component selection, derating or safety approval.
