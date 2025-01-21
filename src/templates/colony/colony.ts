import { default as ForceGraph } from 'force-graph';
import { Colony, ColonyGraphData, ColonyLink, ColonyNode, LinkKind } from "../../scripts/colony";
import { audio, button, Checkbox, div, h3, If, importScript, Labeled, p, style, TextInput } from '../../smork/dom';
import { assignTo, ref } from '../../smork/refs';
import { $throw, doAndReturn, findInSet, jsonClone, sortByDate, Undefined } from '../../utils';
import { ClipCard } from './ClipCard';
import { colonyCss } from './css';
import { compact, debounce } from '../../lodashish';

export async function render(
  ctx: Colony,
  rawData: ColonyGraphData, {
    mode = Undefined<'3D' | '3d'>(),
  }
) {

  const in3D = mode?.toLowerCase() === '3d';
  const hideUI = ref(false);
  const showUI = hideUI.map(hide => !hide);

  const graphContainer = ref<HTMLDivElement>();
  const useNextLinks = ref(true);
  const useDescendantLinks = ref(true);
  const filterString = ref('');
  const showNextLinks = ref(false);

  const audioElement = ref<HTMLAudioElement>();

  const selectedClip = ref<ColonyNode>();
  selectedClip.watch(() => 
    setTimeout(() => { // we want to make sure the element is updated before we try to play it
      audioElement.value?.play();
    }, 0)
  );

  const nodesById = new Map<string, ColonyNode>();
  function nodeById(id: string) {
    return nodesById.get(id) ?? doAndReturn(
      data.value?.nodes.find(node => node.id === id) ?? $throw(`Node with ID ${id} not found.`),
      node => nodesById.set(id, node)
    );
  };
  // TODO: Reuse the Colony method for this

  const GraphRenderer: typeof ForceGraph = await importScript(window, 'ForceGraph', `https://unpkg.com/${in3D ? '3d-' : ''}force-graph`);
  window.document.head.appendChild(style([colonyCss]));

  type ProcessedLink = Omit<ColonyLink, 'source' | 'target'> & {
    source: string | ColonyNode;
    target: string | ColonyNode;
  }; //! because ForceGraph mutates links by including source and target nodes instead of their IDs

  const graphData = jsonClone(rawData); //! again, because ForceGraph mutates the data

  const graph = graphContainer.mapDefined(container => {
    const graph = new GraphRenderer<ColonyNode, ProcessedLink>(container)
      // .graphData(graphData)
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
    return graph;
  });

  const data = graph.map(graph => graph?.graphData());

  async function redrawGraph() {
    new FinalizationRegistry(() => console.log('Previous graph destroyed, container removed from memory')).register(graph, '');
    graph.value?._destructor();
    container.remove();
    await render(this, rawData, { mode });
  };

  ref({ graph, showNextLinks }).map(({ graph, showNextLinks }) => {
    graph?.linkVisibility(link => {
      return !{
        descendant: true,
        next: !showNextLinks,
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
  
  const graphLastUpdated = ref(Date.now);
  const reusableData = ref({ data, graph }).map(({ data, graph }) => {
    const existing = graph?.graphData();
    return existing ? data && {
      nodes: data.nodes.map(node => existing.nodes.find(sameIdAs(node)) ?? node),
      links: data.links.map(link => existing.links.find(l => sameId(link.source, l.source) && sameId(link.target, l.target)) ?? link)
    } : data;
  });

  const matchingNodes = ref({ reusableData, filterString, graph }).map(({ reusableData: { nodes } = {}, filterString: filter, graph }) => {
    if ( !nodes || !graph ) return [];
    if ( !filter ) return nodes;
    filter = filter.toLowerCase();
    return nodes.filter(node => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter));
  });

  ref({ graph, matchingNodes }).watchImmediate(({ graph, matchingNodes }) =>
    graph?.nodeVal(node => matchingNodes.some(n => n.id === node.id) ? 3 : node.val)
  );

  const nodes = ref({ matchingNodes, reusableData }).map(({ matchingNodes, reusableData: { nodes } = {} }) => {    
    return [
      ...matchingNodes,
      ...nodes?.filter(node => matchingNodes.some(n => n.rootId === node.rootId && n.id !== node.id)) ?? []
      // (^same root nodes)
    ];
  });

  const nextLinks = ref({ nodes, useNextLinks }).map(({ nodes, useNextLinks }) => {
    if ( !nodes || !useNextLinks )
      return [];
    sortByDate(nodes);
    return nodes.slice(1).map((node, i) => ({
      source: nodes[i].id,
      target: node.id,
      kind: 'next' as const,
      color: '#006',
      isMain: false
    }));
  });
  
  const descendantLinks = ref({ nodes, useDescendantLinks }).map(({ nodes, useDescendantLinks }) => {
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
  });

  const links = ref({ reusableData, nodes, nextLinks, descendantLinks }).map(
    ({ reusableData: { links } = {}, nodes, nextLinks, descendantLinks }) => {
      if ( !links || !nodes ) return [];
      return [
        ...links,
        ...nextLinks,
        ...descendantLinks
      ];
    }
  );

  ref({ graph, nodes, links }).watchImmediate(({ graph, ...data }) => {
    graph?.graphData(data);
    graphLastUpdated.update();
  });

  setTimeout(() => {
    useNextLinks.set(false);
    useDescendantLinks.set(false);
  }, 2000);
  //! (We need to start with using time-based/root forces for a more interesting initial layout, but we want to release them then because they kinda look bad)
  
  const container = document.body.appendChild(
    div({ 
      class: 'colony', style: 'position: fixed; top: 0px; left: 0px; z-index: 100;'
    }, [
      If(showUI,
        div({ style: 'flex-direction: column; height: 100vh; width: 100vh; background-color: #000;' }, [
          graphContainer.value = div(),
          div({ id: 'sidebar' }, [  
            div({ class: 'settings f-col' }, [
              button({ 
                style: 'margin-bottom: 5px;',
                onclick: () => hideUI.set(true)
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
                audioElement.value = audio({ src: clip.audio_url, controls: true, class: 'w-100' })
              ])
            })
          ])
        ]),
        button({ 
          style: 'position: fixed; top: 0px; left: 0px; padding: 5px; z-index: 100;',
          onclick: () => hideUI.set(false)
        }, [
          'Reopen Colony'
        ])
      )
    ]
  )
);


};


