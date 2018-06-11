import { unknownOp } from '../util';
import MISSING from './missing_symbol';
import Path from './path';

class Value {
    constructor(public value) {
    }
    get ResultType() { return this.constructor; }

    static any(value) {
        if (typeof value === 'number') {
            return new NumberValue(value);
        }

        if (typeof value === 'string') {
            return new StringValue(value);
        }

        if (Array.isArray(value)) {
            return new ArrayValue(value);
        }

        if (value instanceof Date) {
            return new DateValue(value);
        }

        return new Value(value);
    }

    static literal(value) {
        return new Literal(Value.any(value));
    }

    run(fields?) { return this.value; }
}

class NumberValue extends Value {
    static isType(value) { return typeof value === 'number'; }
}

class StringValue extends Value {
    static isType(value) { return typeof value === 'string'; }
}

class ArrayValue extends Value {
    static isType(value) { return Array.isArray(value); }
}

class DateValue extends Value {
    static isType(value) { return value instanceof Date; }
}

class Literal extends Value {
    get ResultType() { return this.value.ResultType; }

    run() { return this.value.run(); }
}

class Get {
    constructor(public path) { }

    run(fields) {
        const value = fields.get(this.path);

        return value === MISSING ? null : value;
    }
}

class ObjectExpr extends Value {
    run(fields?) {
        const result = {}, { value } = this;

        for (var field in value) {
            result[field] = value[field].run(fields);
        }

        return result;
    }
}

class Operator {
    args: any[] = []
    get alt() { return new Value(null); }

    add(node) { this.args.push(node); }
}

class FnOp<T=any> extends Operator {
    constructor(public fn/* : (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T */) {
        super();
    }

    get length() { return Infinity; }

    run(fields) {
        const { args, fn } = this;

        return args.map(arg => arg.run(fields)).reduce(fn);
    }
}

class UnaryFnOp extends FnOp {
    get length() { return 1; }

    run(fields) { return this.fn(this.args[0].run(fields)); }
}

const fnOp = (Parent: typeof FnOp, fn) => {
    return class extends Parent {
        constructor() { super(fn); }
    };
};

const opTypes = (Parent: typeof FnOp, InputType, ResultType = InputType) => {
    const OpConstructor = class extends Parent {
        InputType = InputType;
        ResultType = ResultType;
    };

    return OpConstructor;
};

class ArithOp extends opTypes(FnOp, NumberValue) { }

const arithOp = fn => fnOp(ArithOp, fn);

class Add extends arithOp((a, b) => a + b) { }
class Subtract extends arithOp((a, b) => a - b) { }
class Multiply extends arithOp((a, b) => a * b) { }
class Divide extends arithOp((a, b) => a / b) { }
class Mod extends arithOp((a, b) => a % b) { }

class MathOp extends opTypes(FnOp, NumberValue) {
    get length() { return this.fn.length; }

    run(fields) {
        return this.fn(...this.args.map(arg => arg.run(fields)));
    }
}

const mathOp = fn => fnOp(MathOp, fn);

class Abs extends mathOp(Math.abs) { }
class Ceil extends mathOp(Math.ceil) { }
class Floor extends mathOp(Math.floor) { }
class Ln extends mathOp(Math.log) { }
class Log10 extends mathOp(Math.log10) { }
class Pow extends mathOp(Math.pow) { }
class Sqrt extends mathOp(Math.sqrt) { }
class Trunc extends mathOp(Math.trunc) { }

class StringConcatOp extends opTypes(FnOp, StringValue) { }
class Concat extends fnOp(StringConcatOp, (a, b) => a + b) { }

class CaseOp extends opTypes(UnaryFnOp, StringValue) {
    get alt() { return new StringValue(''); }
}

class ToLower extends fnOp(CaseOp, s => s.toLowerCase()) { }
class ToUpper extends fnOp(CaseOp, s => s.toUpperCase()) { }

class ConcatArraysOp extends opTypes(FnOp, ArrayValue) { }
class ConcatArrays extends fnOp(ConcatArraysOp, (a, b) => a.concat(b)) { }

class DateOp extends opTypes(UnaryFnOp, DateValue, NumberValue) { }

const dateOp = fn => fnOp(DateOp, fn);

class DayOfMonth extends dateOp(d => d.getDate()) { }
class Year extends dateOp(d => d.getUTCFullYear()) { }
class Month extends dateOp(d => d.getUTCMonth() + 1) { }
class Hour extends dateOp(d => d.getUTCHours()) { }
class Minute extends dateOp(d => d.getUTCMinutes()) { }
class Second extends dateOp(d => d.getUTCSeconds()) { }
class Millisecond extends dateOp(d => d.getUTCMilliseconds()) { }

class TypeCond {
    constructor(public stack, public args, public op) {
        const { InputType, alt } = op;

        this.result_types = new Set([op.ResultType, alt.ResultType]);
        this.isType = InputType.isType;
        this.alt_value = alt.value;
    }
    isType: (value: any) => boolean
    alt_value
    result_types: Set<any>

    run(fields) {
        const { stack, isType, op } = this;
        const new_args: any[] = [];

        for (var arg of this.args) {
            const result = arg.run(fields);

            if (!isType(result)) { return this.alt_value; }

            new_args.push(result);
        }

        for (var i = new_args.length - 1; i >= 0; i--) {
            stack.push(new_args[i]);
        }

        return op.run(fields);
    }
}

class PopFromStack {
    constructor(public stack: any[]) { }

    run() { return this.stack.pop(); }
}

const ops = {
    $add: Add,
    $subtract: Subtract,
    $multiply: Multiply,
    $divide: Divide,
    $mod: Mod,
    $abs: Abs,
    $ceil: Ceil,
    $floor: Floor,
    $ln: Ln,
    $log10: Log10,
    $pow: Pow,
    $sqrt: Sqrt,
    $trunc: Trunc,
    $concat: Concat,
    $toLower: ToLower,
    $toUpper: ToUpper,
    $concatArrays: ConcatArrays,
    $dayOfMonth: DayOfMonth,
    $year: Year,
    $month: Month,
    $hour: Hour,
    $minute: Minute,
    $second: Second,
    $millisecond: Millisecond
};

const buildOp = (paths, name, args) => {
    const Op = ops[name];
    if (!Op) { unknownOp(name); }

    if (!Array.isArray(args)) { args = [args]; }

    const op = new Op();
    const tc_nodes: any[] = [];
    const new_paths: any[] = [];
    const stack: any[] = [];

    for (var i = 0; i < args.length && i < op.length; i++) {
        const arg = build(new_paths, args[i]);

        if (arg.ResultType) {
            if (arg.ResultType !== op.InputType) {
                return op.alt;
            }

            op.add(arg);

            continue;
        }

        if (arg instanceof TypeCond) {
            if (!arg.result_types.has(op.InputType)) {
                return op.alt;
            }

            if (arg.result_types.size === 1) {
                op.add(arg);

                continue;
            }
        }

        tc_nodes.push(arg);
        op.add(new PopFromStack(stack));
    }

    if (!new_paths.length) {
        return new op.ResultType(op.run());
    }

    paths.push(...new_paths);

    if (!tc_nodes.length) { return op; }

    return new TypeCond(stack, tc_nodes, op);
};

const buildObject = (paths, expr) => {
    const op_names = new Set(), fields = new Set();

    for (var field in expr) {
        (field[0] === '$' ? op_names : fields).add(field);
    }

    if (op_names.size > 1) {
        throw Error('objects cannot have more than one operator');
    }

    if (op_names.size) {
        for (var path of fields) {
            throw Error(`unexpected field '${path}'`);
        }

        for (var name of op_names) {
            if (name === '$literal') {
                return Value.literal(expr[name]);
            }

            return buildOp(paths, name, expr[name]);
        }
    }

    const new_paths = [], obj = {};

    for (var field in expr) {
        obj[field] = build(new_paths, expr[field]);
    }

    const node = new ObjectExpr(obj);

    if (!new_paths.length) {
        return new Value(node.run());
    }

    paths.push(...new_paths);

    return node;
};

const build = (paths, expr) => {
    if (typeof expr === 'string' && expr[0] === '$') {
        const path = new Path(expr.substring(1));

        paths.push(path);

        return new Get(path);
    }

    if (expr == null || expr.constructor !== Object) {
        return Value.any(expr);
    }

    return buildObject(paths, expr);
};

export default (expr) => {
    const paths = [], ast = build(paths, expr);

    return {
        ast,
        paths,
        has_refs: !!paths.length
    };
};