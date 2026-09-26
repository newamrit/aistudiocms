import * as origJsxDev from 'react/jsx-dev-runtime';
import * as origJsx from 'react/jsx-runtime';

function sanitizeProps(type: any, props: any) {
  if (typeof type === 'string' && props) {
    // Check children first as it's the most common source of NaN warnings
    if (typeof props.children === 'number' && Number.isNaN(props.children)) {
      props.children = 0;
    } else if (Array.isArray(props.children)) {
      for (let i = 0; i < props.children.length; i++) {
        if (typeof props.children[i] === 'number' && Number.isNaN(props.children[i])) {
          props.children[i] = 0;
        }
      }
    }

    // Check all other props for NaN values which React warns about for DOM elements
    for (const key in props) {
      if (key !== 'children' && typeof props[key] === 'number' && Number.isNaN(props[key])) {
        // For DOM attributes, NaN is invalid. We set it to 0 or undefined depending on common sense.
        // For most attributes, 0 is a safer fallback than NaN which triggers React warnings.
        props[key] = 0;
      }
    }
  }
  return props;
}

export const Fragment = origJsxDev.Fragment;

export function jsxDEV(type: any, props: any, key: any, isStaticChildren: boolean, source: any, self: any) {
  return (origJsxDev as any).jsxDEV(type, sanitizeProps(type, props), key, isStaticChildren, source, self);
}

export function jsx(type: any, props: any, key: any) {
  return (origJsx as any).jsx(type, sanitizeProps(type, props), key);
}

export function jsxs(type: any, props: any, key: any) {
  return (origJsx as any).jsxs(type, sanitizeProps(type, props), key);
}
