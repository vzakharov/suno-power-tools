import { type default as ForceGraph } from 'force-graph';
import { mapValues } from '../../lodashish';
import { ColonyGraphData, ColonyLink, ColonyNode, LinkKind } from "../../scripts/colony";
import { a, audio, button, checkbox, div, h3, img, importScript, labeled, p, style, textInput } from "../../smork";
import { sortByDate } from '../../utils';
import { colonyCss } from './css';

export async function render(rawData: ColonyGraphData, {
  in3D = false,
  win = window
}) {

  let graphContainer: HTMLDivElement;
  let closeButton: HTMLButtonElement;

  let useNextLinksCheckbox: HTMLInputElement;
  let showNextLinksContainer: HTMLDivElement;
  let showNextLinksCheckbox: HTMLInputElement;
  let useDescendantLinksCheckbox: HTMLInputElement;
  let filterInput: HTMLInputElement;
  let audioContainer: HTMLDivElement;
  let audioLink: HTMLAnchorElement;
  let audioImage: HTMLImageElement;
  let audioName: HTMLDivElement;
  let audioTags: HTMLDivElement;
  let audioElement: HTMLAudioElement;

  const GraphRenderer: typeof ForceGraph = await importScript(win, 'ForceGraph', `https://unpkg.com/${in3D ? '3d-' : ''}force-graph`);
  win.document.head.appendChild(style([colonyCss]));
  
  const container = div(
    {
      style: {
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        zIndex: '100',
      }
    }, [
      graphContainer = div(),
      div({ id: 'sidebar' }, [
        div({
          class: 'settings f-col'
        }, [
          closeButton = button({ style: { backgroundColor: '#444', color: '#eee', marginBottom: '5px'} }, [
            'Close Colony'
          ]),
          h3(['Settings']),
          div(
            labeled('Attract based on time',
              useNextLinksCheckbox = checkbox({ checked: true })
            )
          ),
          showNextLinksContainer = div(
            labeled('Show time-based links',
              showNextLinksCheckbox = checkbox()
            )
          ),
          div(
            labeled('Attract to root clip',
              useDescendantLinksCheckbox = checkbox({ checked: true })
            )
          ),
          div([
            filterInput = textInput({ placeholder: 'Filter by name, style or ID' }),
            p({ class: 'smol' }, [
              'Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)'
            ])
          ])
        ]),
        audioContainer = div({ class: 'w-100', style: { display: 'none' } }, [
          div({ class: 'relative' }, [
            audioLink = a({ target: '_blank' }, [
              audioImage = img({ style: 'opacity: 0.5', class: 'w-100' })
            ]),
            div({ class: 'absolute topleft', style: 'width: 190px; padding: 5px;' }, [
              audioName = div(),
              audioTags = div({ class: 'smol' })
            ])
          ]),
          audioElement = audio({ controls: true, class: 'w-100' })
        ])
      ])
    ]
  );

  const reopenButton = button({ style: { 
    position: 'fixed', top: '0px', left: '0px', padding: '5px', backgroundColor: '#444', color: '#eee', zIndex: '100'
  } }, [
    'Reopen Colony'
  ]);

  function showContainer() {
    win.document.body.appendChild(container);
    reopenButton.parentElement?.removeChild(reopenButton);
  };

  showContainer();

  closeButton.addEventListener('click', () => {
    win.document.body.removeChild(container);
    win.document.body.appendChild(reopenButton);
  });
  
  reopenButton.addEventListener('click', () => {
    showContainer();
  });

  type ProcessedLink = Omit<ColonyLink, 'source' | 'target'> & {
    source: string | ColonyNode;
    target: string | ColonyNode;
  }; //! because ForceGraph mutates links by including source and target nodes instead of their IDs

  const graph = new GraphRenderer<ColonyNode, ProcessedLink>(
    graphContainer
  )
    .graphData(rawData)
    .backgroundColor('#001')
    .linkAutoColorBy('kind')
    .nodeAutoColorBy('rootId')
    .linkLabel('kind')
    .linkVisibility(visibilityChecker)
    .linkDirectionalParticles(1)
    .nodeLabel(({ id, name, tags, image_url }) => `
      <div class="relative" style="width: 200px;">
        <img src="${image_url}" style="opacity: 0.5; width: 200px">
        <div class="absolute topleft" style="width: 190px; padding: 5px;">
          <div>${name || '[Untitled]'}</div>
          <div class="smol">${tags || '(no style)'}</div>
        </div>
      </div>
      <div class="smol">
        Click to play, right-click to open in Suno
      </div>
    `)
    .onNodeClick(({ id, name, tags, image_url, audio_url }) => {
      audioContainer.style.display = 'block';
      audioLink.href = `https://suno.com/song/${id}`;
      audioImage.src = image_url;
      audioName.innerText = name || '[Untitled]';
      audioTags.innerText = tags || '(no style)';
      audioElement.src = audio_url;
      audioElement.play();
    })
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

  const data = graph.graphData();

  function visibilityChecker(link: ProcessedLink) {
    return !{
      descendant: true,
      next: !showNextLinksCheckbox.checked
    }[link.kind];
  };

  function applyLinkFilter(kind: LinkKind, checkbox: HTMLInputElement) {
    const useLinks = checkbox.checked;
    let { nodes, links } = graph.graphData();
    if ( !useLinks ) {
      links = links.filter(l => l.kind !== kind);
    } else {
      links.push(...data.links.filter(l => l.kind === kind));
    }
    if ( kind === 'next' ) {
      showNextLinksContainer.style.display = checkbox.checked ? 'block' : 'none';
      // Remove 'next' links, just in case they're already there
      links = links.filter(l => l.kind !== 'next');
      if ( checkbox.checked ) {
        // Add 'next' links dynamically by going from the oldest to the newest node
        sortByDate(nodes);
        for ( let i = 1; i < nodes.length; i++ ) {
          const source = nodes[i - 1];
          const target = nodes[i];
          links.push({
            source: source.id,
            target: target.id,
            kind: 'next',
            color: '#006',
            isMain: false
          });
        };
      }
    };
    graph.graphData({ nodes, links });
  };


  function applyCheckboxFilters(firstTime = false) {
    mapValues( {
      next: useNextLinksCheckbox,
      descendant: useDescendantLinksCheckbox
    }, (checkbox, kind) => {
      applyLinkFilter(kind, checkbox);
      if ( firstTime ) {
        checkbox.addEventListener('change', () => {
          applyLinkFilter(kind, checkbox);
        });
      };
    } );
  };

  applyCheckboxFilters(true);

  showNextLinksCheckbox.addEventListener('change', () => {
    graph.linkVisibility(visibilityChecker);
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

  filterInput.addEventListener('keyup', e => {
    if ( e.key === 'Enter' ) {
      const filter = filterInput.value.toLowerCase();
      const matchingNodes = filter 
        ? data.nodes.filter(node => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter))
        : data.nodes;
      const existing = graph.graphData();
      const nodes = [
        ...matchingNodes.map(node => existing.nodes.find(sameIdAs(node)) ?? node),
        ...filter 
          ? data.nodes.filter(node => matchingNodes.some(n => n.rootId === node.rootId && n.id !== node.id))
          : []
      ].map(node => existing.nodes.find(n => n.id === node.id) ?? node);
      const links = data.links
        .filter(link => nodes.some(sameIdAs(link.source)) && nodes.some(sameIdAs(link.target)))
        .map(({ source, target, ...rest }) => ({ source: id(source), target: id(target), ...rest }))
        .map(link => existing.links.find(l => sameId(link.source, l.source) && sameId(link.target, l.target)) ?? link);
      graph.graphData({ nodes, links });
      if ( filter )
        graph.nodeVal(node => matchingNodes.some(n => n.id === node.id) ? 3 : node.val);
      else
        graph.nodeVal('val');
      applyCheckboxFilters();
    }
  });

  setTimeout(() => {
    useNextLinksCheckbox.click();
    useDescendantLinksCheckbox.click();
  }, 2000);
  //! (We need to start with using time-based/root forces for a more interesting initial layout, but we want to release them then because they kinda look bad)

  return [ container, reopenButton ];
};