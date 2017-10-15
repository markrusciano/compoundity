import * as React from 'react';
import CalculationParameters from '../model/CalculationParameters';
import { FormGroup, FormControl, ControlLabel, InputGroup } from 'react-bootstrap';

export interface ParameterFormProps {
    onParameterChanged: Function;
}

type StateKeys = keyof ParameterFormState;

export interface ParameterFormState extends CalculationParameters { }

export default class ParameterForm extends React.Component<ParameterFormProps, ParameterFormState> {
    constructor(props: ParameterFormProps) {
        super(props);
        this.state = {
            annualIncome: '50000',
            annualSavings: '30000',
            annualExpenses: '20000',
            savingRate: '60',
            portfolioValue: '0',
            annualReturn: '5',
            withdrawalRate: '4'
        };

        this.handleInputChange = this.handleInputChange.bind(this);
    }

    handleInputChange(event: React.FormEvent<FormControl>) {
        const target = event.target as HTMLInputElement;
        const value = target.value;
        const name = target.name as StateKeys;

        /* tslint:disable */
        this.setState({
            [name as any]: value
        });
        /* tslint:enable */

    }

    render() {
        return (
            <form>
                <ParamInput
                    id="annualIncome"
                    label="Annual Income"
                    value={this.state.annualIncome}
                    type="number"
                    onChange={this.handleInputChange}
                    preAddon="$"
                />

                <ParamInput
                    id="annualSavings"
                    label="Annual Savings"
                    value={this.state.annualSavings}
                    type="number"
                    onChange={this.handleInputChange}
                    preAddon="$"
                />

                <ParamInput
                    id="annualExpenses"
                    label="Annual Expenses"
                    value={this.state.annualExpenses}
                    type="number"
                    onChange={this.handleInputChange}
                    preAddon="$"
                />

                <ParamInput
                    id="savingRate"
                    label="Saving Rate"
                    value={this.state.savingRate}
                    type="number"
                    onChange={this.handleInputChange}
                    postAddon="%"
                />

                <ParamInput
                    id="portfolioValue"
                    label="PortfolioValue"
                    value={this.state.portfolioValue}
                    type="number"
                    onChange={this.handleInputChange}
                    preAddon="$"
                />

                <ParamInput
                    id="annualReturn"
                    label="Annual Return"
                    value={this.state.annualReturn}
                    type="number"
                    onChange={this.handleInputChange}
                    postAddon="%"
                />

                <ParamInput
                    id="withdrawalRate"
                    label="Withdrawal Rate"
                    value={this.state.withdrawalRate}
                    type="number"
                    onChange={this.handleInputChange}
                    postAddon="%"
                />
            </form>);
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