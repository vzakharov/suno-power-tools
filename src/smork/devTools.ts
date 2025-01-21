import type _ForceGraph from "force-graph";
import { type NodeObject } from "force-graph";
import { uniqueId } from "../lodashish";
import { OptionalIfNotInBoth } from "../types";
import { $throw, getOrSet, mutate } from "../utils";
import { $import, button, div, If } from "./dom";
import { ref, Ref, Watcher } from "./refs";

export const DEV_MODE = true;
export const allRefs = new Set<Ref<any>>();
export const allElements = new Set<HTMLElement>();
export const refToElementLinks = new Map<Ref<any>, Set<HTMLElement>>();

declare global {
  interface Window {
    smork: {
      devTools: typeof devTools;
    };
  }
}

export async function devTools() {

  const ForceGraph: typeof _ForceGraph = await $import('ForceGraph', `https://unpkg.com/force-graph`);
  let container: HTMLDivElement;
  let graphContainer: HTMLDivElement;
  const minimized = ref(false).named('minimized');
  const size = minimized.map(minimized => minimized ? '10': '70');

  document.body.appendChild(
    container = div({ style: "position: fixed; top: 0; right: 0; z-index: 300; background: #eee; padding: 1em;" }, [
      div({ style: 'position: relative;' }, [
        graphContainer = div({ style: size.map(size => `height: ${size}vh; width: ${size}vw; overflow: auto`) }),
        button({
          style: 'position: absolute; top: 0; left: 0; color: black',
          onclick: () => container.remove()
        }, ['X']),
        button({
          style: 'position: absolute; top: 0; right: 0; color: black',
          onclick: () => minimized.set(!minimized.value)
        }, [
          If(minimized, '↙', '↗')
        ]),
      ]),
    ])
  );

  // Refs

  const refs = [...allRefs];

  const refNodes = refs.map(ref => ({
    id: ref.id,
    ref,
    class: ref.constructor.name,
    name: `${ref.name ?? ref.id} (${ref.constructor.name}) = ${
      Array.isArray(ref.value)
        ? `${ref.value.length} ✕ ${ref.value[0]?.constructor.name}`
        : ref.value?.toString()
    }`,
    val: 3
  }));

  const refLinks = refNodes.map(({ id: source, ref: { targets } }) => [...targets].map(({ id: target }) => ({ source, target }))).flat();

  // Watchers

  const watcherNodes = refs.map(({ watchers }) => [...watchers].map(watcher => ({
    id: uniqueId('watcher-'),
    watcher,
    class: 'watcher',
    name: `${watcher.toString()}`,
  }))).flat();

  const idByWatcher = new Map(watcherNodes.map(({ watcher, id }) => [ watcher, id ]));

  const watcherLinks = refs.map(({ id: source, watchers }) => [...watchers].map(watcher => ({
    source,
    target: idByWatcher.get(watcher) ?? $throw(`Watcher ${watcher} has no ID.`)
  })).flat()).flat();

  // Elements

  function ElementNode(element: HTMLElement) {
    return {
      id: uniqueId('el-'),
      element,
      class: element.constructor.name,
      name: `${element.tagName}#${element.id || ''}.${element.className}`,
      val: element.querySelectorAll('*').length
    };
  };
  
  type ElementNode = ReturnType<typeof ElementNode>;

  const elementNodes = [...allElements].map(ElementNode);

  const idByElement = new Map<HTMLElement, string>();
  const getElementId = (element: HTMLElement) => {
    const elementId = (
      elementNodes.find(({ element: e }) => e === element) ?? (() => {
        const newElementNode = ElementNode(element);
        elementNodes.push(newElementNode)
        return newElementNode;
      })()
    ).id;
    return getOrSet(idByElement, element, elementId);
  };

  const elementLinks = [

    ...[...refToElementLinks].map(([ { id: source }, elements ]) =>
      [...elements].map(element => ({ source, target: getElementId(element) })
    )).flat(),

    ...[...allElements].map(element => {
      const children = [...element.children].filter(child => child instanceof HTMLElement); // we don't want to link to text nodes or elements created outside of Smork
      return children.map(child => ({ source: getElementId(element), target: getElementId(child as HTMLElement) }));
    }).flat()
    
  ];
    
  type Node = NodeObject & OptionalIfNotInBoth<OptionalIfNotInBoth<typeof refNodes[number], typeof watcherNodes[number]>, typeof elementNodes[number]>;

  const nodes = [...refNodes, ...elementNodes, ...watcherNodes];
  const links = [...refLinks, ...elementLinks, ...watcherLinks];
  const graphData = { nodes, links };

  const getColorForIndex = (index: number) => '#' + ((index * 1234567) % Math.pow(2, 24)).toString(16).padStart(6, '0');
  let maxIndex = 0;
  const indexByString = new Map<string, number>();
  const getColorForString = (string: string) =>
    getColorForIndex(getOrSet(indexByString, string, ++maxIndex))
  
  new ForceGraph<Node>(graphContainer)
    .graphData(graphData)
    .onNodeClick(({ ref, element }) => { 
      console.log(
        ...ref 
          ? [ ref, ref['_value'] ] // to avoid TypeScript complaining about accessing a private property
          : [ element ]
      );
      mutate(window, { $: ref ?? element });
    })
    .nodeAutoColorBy('class')
    .nodeCanvasObjectMode(({ ref, element }) => ref ? 'after' : element && 'replace')
    .nodeCanvasObject(({ ref, element, x, y, val }, ctx) => {
      // For named refs, add a text label
      if ( ref?.name && x && y ) {
        ctx.font = '10px Arial';
        ctx.fillText(ref.name, x + 10, y);
      }
      // For elements, draw a hollow circle
      if ( element && x && y ) {
        ctx.beginPath();
        ctx.arc(x, y, Math.sqrt( Number(val) + 1 ), 0, 2 * Math.PI, false);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = getColorForString(element.tagName);
        ctx.stroke();
      };
    })
    .linkLineDash(({ target }) => typeof target === 'object' && target.element ? [ 4, 2 ] : null)
    .linkDirectionalParticles(1);

  const result = { refNodes, elementNodes, refLinks, watcherLinks, elementLinks };
  mutate(window.smork, result );
  console.log(result);
  
};

Object.assign(window, { smork: { devTools, allRefs, allElements, refToElementLinks } });