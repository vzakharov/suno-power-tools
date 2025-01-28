import { default as ForceGraph } from 'force-graph';
import { compact } from '../../lodashish';
import { Colony, ColonyGraphData, ColonyLink, ColonyNode } from "../../scripts/colony";
import { $import, audio, button, Checkbox, div, h3, If, Labeled, p, style, TextInput } from '../../smork/dom';
import { assignTo, ref } from '../../smork/refs';
import { $throw, doAndReturn, jsonClone, sortByDate } from '../../utils';
import { Undefined } from "../../types";
import { ClipCard } from './ClipCard';
import { colonyCss } from './css';

export async function render(
  ctx: Colony,
  rawData: ColonyGraphData, {
    mode = Undefined<'3D' | '3d'>(),
  }
) {

  const fullData = jsonClone(rawData); //! because ForceGraph mutates the data
  const in3D = mode?.toLowerCase() === '3d';
  const hideUI = ref(false).named('hideUI');
  const showUI = hideUI.map(hide => !hide).named('showUI');

  // const graphContainer = ref<HTMLDivElement>().named('graphContainer');
  const useNextLinks = ref(true).named('useNextLinks');
  const useDescendantLinks = ref(true).named('useDescendantLinks');
  const filterString = ref('').named('filterString');
  const showNextLinks = ref(false).named('showNextLinks');

  const audioElement = ref<HTMLAudioElement>().named('audioElement');

  const selectedClip = ref<ColonyNode>().named('selectedClip');
  selectedClip.watch(() => 
    setTimeout(() => { // we want to make sure the element is updated before we try to play it
      audioElement()?.play();
    }, 0)
  );

  const nodesById = new Map<string, ColonyNode>();
  function nodeById(id: string) {
    return nodesById.get(id) ?? doAndReturn(
      fullData?.nodes.find(node => node.id === id) ?? $throw(`Node with ID ${id} not found.`),
      node => nodesById.set(id, node)
    );
  };
  // TODO: Reuse the Colony method for this

  const GraphRenderer: typeof ForceGraph = await $import('ForceGraph', `https://unpkg.com/${in3D ? '3d-' : ''}force-graph`);
  window.document.head.appendChild(style([colonyCss]));

  type ProcessedLink = Omit<ColonyLink, 'source' | 'target'> & {
    source: string | ColonyNode;
    target: string | ColonyNode;
  }; //! because ForceGraph mutates links by including source and target nodes instead of their IDs

  const graphContainer = div()
  const graph = new GraphRenderer<ColonyNode, ProcessedLink>(graphContainer)
    .graphData(fullData)
    .backgroundColor('#001')
    .linkAutoColorBy('kind')
    .nodeAutoColorBy('rootId')
    .linkLabel('kind')
    .linkDirectionalParticles(1)
    .nodeLabel(clip => 
      div([
        ClipCard(clip),
        div({ class: 'smol' }, [
          'Click to play, right-click to open in Suno'
        ])
      ]).outerHTML
    )
    .onNodeClick(assignTo(selectedClip))
    .onNodeRightClick(({ id }) => {
      window.open(`https://suno.com/song/${id}`);
    });
  if ( in3D ) {
    // @ts-expect-error
    graph.linkOpacity(l => l.isMain ? 1 : 0.2)
    // TODO: Implement type-safe access to 3D-specific methods
  } else {
    graph.linkLineDash(l => l.isMain ? null : [1, 2])
  };
  Object.assign(window, { graph });

  async function redrawGraph() {
    new FinalizationRegistry(() => console.log('Previous graph destroyed, container removed from memory')).register(graph, '');
    graph._destructor();
    container.remove();
    await render(this, rawData, { mode });
  };

  showNextLinks.watchImmediate(show => {
    graph.linkVisibility(link => {
      return !{
        descendant: true,
        next: !show,
      }[link.kind];
    });
  });

  type NodeOrId = string | ColonyNode;
  function id(node: NodeOrId) {
    return typeof node === 'string' ? node : node.id;
  };
  function sameId(node1: NodeOrId, node2: NodeOrId) {
    return id(node1) === id(node2);
  };
  function sameIdAs(original: NodeOrId) {
    return (candidate: NodeOrId) => sameId(original, candidate);
  };
  
  const graphLastUpdated = ref(Date.now).named('graphLastUpdated');
  
  // const reusableData = graphLastUpdated
  //   .map(() => {
  //     const data = fullData;
  //     const existing = graph.graphData();
  //     return existing ? data && {
  //       nodes: data.nodes.map(node => existing.nodes.find(sameIdAs(node)) ?? node),
  //       links: data.links.map(link => existing.links.find(l => sameId(link.source, l.source) && sameId(link.target, l.target)) ?? link)
  //     } : data;
  //   })
  //   .named('reusableData');

  const matchingNodes = filterString
    .map(filter => {
      const { nodes } = fullData; //! Note that we are not watching reusableData, just accessing it here
      if ( !filter ) return nodes;
      filter = filter.toLowerCase();
      return nodes.filter(node => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter));
    })
    .named('matchingNodes');

  matchingNodes.watchImmediate(nodes =>
    graph.nodeVal(node => nodes.some(n => n.id === node.id) ? 3 : node.val)
  );

  const filteredNodes = ref({ filter: filterString, nodes: matchingNodes })
    .map(({ filter, nodes }) => {    
      return filter ? [
        ...nodes,
        ...fullData.nodes?.filter((node) => !nodes.includes(node) && nodes.some(n => n.rootId === node.rootId)) ?? []
        // (^same root nodes)
      ] : nodes;
    })
    .named('nodes');

  const linksBetweenFilteredNodes = filteredNodes
    .map(nodes => {
      if ( !nodes ) return [];
      return fullData.links.filter(link => nodes.some(sameIdAs(link.source)) && nodes.some(sameIdAs(link.target)));
    })
    .named('linksBetweenFilteredNodes');

  const nextLinks = ref({ nodes: filteredNodes, useNextLinks })
    .map(({ nodes, useNextLinks }) => {
      if ( !nodes || !useNextLinks )
        return [];
      sortByDate(nodes);
      return nodes
        .filter(node => node.rootId === node.id)
        .slice(1)
        .map((node, i) => ({
          source: nodes[i].id,
          target: node.id,
          kind: 'next' as const,
          color: '#006',
          isMain: false
        }));
    })
    .named('nextLinks');

  const descendantLinks = ref({ nodes: filteredNodes, useDescendantLinks })
    .map(({ nodes, useDescendantLinks }) => {
      if ( !nodes || !useDescendantLinks )
        return [];
      return compact(nodes.map(node => {
        const root = nodeById(node.rootId ?? $throw(`Node ${node.id} has no root ID.`));
        return root !== node ? {
          source: root.id,
          target: node.id,
          kind: 'descendant' as const,
          isMain: false
        } : null;
      }));
    })
    .named('descendantLinks');

  const filteredLinks = ref({ linksBetweenFilteredNodes, nextLinks, descendantLinks })
    .map(
      ({ linksBetweenFilteredNodes, nextLinks, descendantLinks }) => {
        return [
          ...linksBetweenFilteredNodes,
          ...nextLinks,
          ...descendantLinks,
        ];
      }
    )
    .named('links');

  ref({ nodes: filteredNodes, links: filteredLinks })
    .named('graphData')
    .watchImmediate(data => {
      graph.graphData(data);
      graphLastUpdated.update();
    });

  setTimeout(() => {
    useNextLinks(false);
    useDescendantLinks(false);
  }, 2000);
  //! (We need to start with using time-based/root forces for a more interesting initial layout, but we want to release them then because they kinda look bad)
  
  const container = document.body.appendChild(
    div({ 
      class: 'colony', style: 'position: fixed; top: 0px; left: 0px; z-index: 100;'
    }, [
      If(showUI,
        div({ style: 'flex-direction: column; height: 100vh; width: 100vh; background-color: #000;' }, [
          graphContainer,
          div({ id: 'sidebar' }, [  
            div({ class: 'settings f-col' }, [
              button({ 
                style: 'margin-bottom: 5px;',
                onclick: () => hideUI(true)
              }, [
                'Close Colony'
              ]),
              h3(['Settings']),
              div(
                Labeled('Attract based on time',
                  Checkbox(useNextLinks)
                )
              ),
              If(useNextLinks, div(
                Labeled('Show time-based links',
                  Checkbox(showNextLinks)
                )
              )),
              div(
                Labeled('Attract to root clip',
                  Checkbox(useDescendantLinks)
                )
              ),
              div([
                TextInput(filterString, { placeholder: 'Filter by name, style or ID' }),
                p({ class: 'smol' }, [
                  'Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)'
                ])
              ]),
              button({ onclick: redrawGraph }, [
                'Redraw'
              ]),
              button({ onclick: () => ctx.renderToFile(mode) }, [
                'Download'
              ])
            ]),
            If(selectedClip, clip => {
              return div({ class: 'w-100' }, [
                ClipCard(clip),
                audioElement(
                  audio({ src: clip.audio_url, controls: true, class: 'w-100' })
                )
              ])
            })
          ])
        ]),
        button({ 
          style: 'position: fixed; top: 0px; left: 0px; padding: 5px; z-index: 100;',
          onclick: () => hideUI(false)
        }, [
          'Reopen Colony'
        ])
      )
    ]
  )
);


};


