import { Enum, Enumerator, Field, Property, getSchema } from "@mrleebo/prisma-ast";
import { readFileSync } from "node:fs";
import { GraphQLObjectType, GraphQLSchema, GraphQLOutputType, printSchema, GraphQLString, GraphQLFieldConfig, GraphQLType, GraphQLBoolean, GraphQLInt, GraphQLFloat, GraphQLScalarType, GraphQLNonNull, GraphQLNamedType, GraphQLList, GraphQLEnumType } from "graphql";


let DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime'
})
let JSONScalar = new GraphQLScalarType({
  name: 'Json'
})
let BytesScalar = new GraphQLScalarType({
  name: 'Bytes'
})
let scalars = [
  DateTimeScalar,
  JSONScalar,
  BytesScalar
]
let fields: Map<string, Record<string, GraphQLFieldConfig<any, any, any>>>
  = new Map();
try {
  let pschema = getSchema(readFileSync(process.argv[2]).toString())
  let types: Array<GraphQLNamedType> = [...scalars];
  for (let e of pschema.list) {
    if (e.type === 'enum') {
      types.push()
    } else if (e.type === 'model') {
      let name = e.name
      let t = types.find(tx => tx.name === name) as GraphQLObjectType;
      if (!t) {
        types.push(t = new GraphQLObjectType({
          name: e.name,
          fields: () => fields.get(name) ?? {}
        }))
      }

      let ofields = e.properties.filter(p => p.type === 'field').map(p => {
        let px = p as Field;

        let fieldType: GraphQLType;

        switch (px.fieldType) {
          case 'String':
            fieldType = GraphQLString;
            break;
          case 'Boolean':
            fieldType = GraphQLBoolean;
            break;
          case 'Int':
            fieldType = GraphQLInt;
            break;
          case 'Float':
            fieldType = GraphQLFloat;
            break
          case 'DateTime':
            fieldType = DateTimeScalar;
            break
          case 'Json':
            fieldType = JSONScalar;
            break
          case 'Bytes':
            fieldType = BytesScalar;
            break
          default:
            let t = types.find(t => t.name === px.fieldType);
            if (!t) {
              let en = pschema.list.find(x => x.type === 'enum' && x.name === px.fieldType) as Enum;
              if (en) {
                types.push(t = new GraphQLEnumType({
                  name: px.fieldType as string,
                  values: Object.fromEntries(en.enumerators.filter(enu => enu.type ==='enumerator').map((ex,i) =>{
                    let exx =ex as Enumerator;
                    return [exx.name,{
                      value: i
                    }];
                  }))
                }))
              } else {
                types.push(t = new GraphQLObjectType({
                  name: px.fieldType as string,
                  fields: () => fields.get(name) ?? {}
                }))
              }
              return null as any;
            } else {
              fieldType = t;
            }
        }
        if (!px.optional) {
          fieldType = new GraphQLNonNull(fieldType);
        }
        if (px.array) {
          fieldType = new GraphQLNonNull(new GraphQLList(fieldType));
        }
        return {
          name: px.name,
          type: fieldType,
        } as GraphQLFieldConfig<any, any, any>
      }).filter(e => e);

      fields.set(name, Object.fromEntries(ofields.map(off => [off.name, off])))
    }
  }

  let gschema = new GraphQLSchema({
    types
  });
  console.log(printSchema(gschema));
} catch (e) {
  console.error(e);
}