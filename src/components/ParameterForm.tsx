import * as React from 'react';
import { CalculationParameters } from '../model/CalculationInterfaces';
import { FormGroup, FormControl, ControlLabel, InputGroup } from 'react-bootstrap';

export type ParameterChangedCallback = (params: CalculationParameters) => void;

export interface ParameterFormProps {
    formParameters: CalculationParameters;
    onParameterChanged: ParameterChangedCallback;
}

export default class ParameterForm extends React.Component<ParameterFormProps> {
    constructor(props: ParameterFormProps) {
        super(props);

        this.handleInputChange = this.handleInputChange.bind(this);
    }

    render() {
        return (
            <form>
                <ParamInput
                    id="annualIncome"
                    label="Annual Income"
                    value={this.props.formParameters.annualIncome}
                    type="number"
                    onChange={this.handleInputChange}
                    preAddon="$"
                />

                <ParamInput
                    id="annualSavings"
                    label="Annual Savings"
                    value={this.props.formParameters.annualSavings}
                    type="number"
                    onChange={this.handleInputChange}
                    preAddon="$"
                />

                <ParamInput
                    id="annualExpenses"
                    label="Annual Expenses"
                    value={this.props.formParameters.annualExpenses}
                    type="number"
                    onChange={this.handleInputChange}
                    preAddon="$"
                />

                <ParamInput
                    id="savingRate"
                    label="Saving Rate"
                    value={this.props.formParameters.savingRate}
                    type="number"
                    onChange={this.handleInputChange}
                    postAddon="%"
                />

                <ParamInput
                    id="portfolioValue"
                    label="PortfolioValue"
                    value={this.props.formParameters.portfolioValue}
                    type="number"
                    onChange={this.handleInputChange}
                    preAddon="$"
                />

                <ParamInput
                    id="annualReturn"
                    label="Annual Return"
                    value={this.props.formParameters.annualReturn}
                    type="number"
                    onChange={this.handleInputChange}
                    postAddon="%"
                />

                <ParamInput
                    id="withdrawalRate"
                    label="Withdrawal Rate"
                    value={this.props.formParameters.withdrawalRate}
                    type="number"
                    onChange={this.handleInputChange}
                    postAddon="%"
                />
            </form>);
    }

    private handleInputChange(event: React.FormEvent<FormControl>) {
        const target = event.target as HTMLInputElement;
        const value = target.value;
        const name = target.name;
        this.props.formParameters[name] = value;
        this.props.onParameterChanged(this.props.formParameters);
    }
}

const ParamInput: React.SFC<{
    id: string,
    label: string,
    value: string,
    type: string,
    onChange: React.FormEventHandler<FormControl>,
    preAddon?: string,
    postAddon?: string
}> =
    ({ id, label, value, type, onChange, preAddon, postAddon }) =>
        (
            <FormGroup controlId={id}>
                <ControlLabel>{label}</ControlLabel>
                <InputGroup>
                    {preAddon && <InputGroup.Addon>{preAddon}</InputGroup.Addon>}
                    <FormControl
                        type={type}
                        name={id}
                        value={value}
                        onChange={onChange}
                    />
                    {postAddon && <InputGroup.Addon>{postAddon}</InputGroup.Addon>}
                </InputGroup>
            </FormGroup>
        );