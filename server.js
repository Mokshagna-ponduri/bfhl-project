const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

function isValidEdge(edge) {
    if (!edge || typeof edge !== "string") return false;

    const trimmed = edge.trim();

    if (!/^[A-Z]->[A-Z]$/.test(trimmed)) return false;

    const [parent, child] = trimmed.split("->");

    if (parent === child) return false;

    return true;
}
function processDuplicates(edges) {
    const seen = new Set();
    const duplicates = [];
    const unique = [];

    edges.forEach(edge => {
        if (!seen.has(edge)) {
            seen.add(edge);
            unique.push(edge);
        } else {
            if (!duplicates.includes(edge)) {
                duplicates.push(edge);
            }
        }
    });

    return { unique, duplicates };
}
function buildGraph(edges) {
    const graph = {};
    const childSet = new Set();
    const assignedChild = new Set(); // tracks children already assigned

    edges.forEach(edge => {
        const [parent, child] = edge.split("->");

        // skip if child already has a parent
        if (assignedChild.has(child)) return;

        if (!graph[parent]) graph[parent] = [];
        graph[parent].push(child);

        childSet.add(child);
        assignedChild.add(child);
    });

    return { graph, childSet };
}
const allNodes = new Set();
unique.forEach(edge => {
    const [p, c] = edge.split("->");
    allNodes.add(p);
    allNodes.add(c);
});
const processed = new Set();
function findRoots(graph, childSet) {
    return Object.keys(graph).filter(node => !childSet.has(node));
}
function dfs(node, graph, visited, recStack) {
    // cycle detected
    if (recStack.has(node)) {
        return { cycle: true };
    }

    // already processed node
    if (visited.has(node)) {
        return { tree: {} };
    }

    visited.add(node);
    recStack.add(node);

    let subtree = {};

    if (graph[node]) {
        for (let child of graph[node]) {
            const result = dfs(child, graph, visited, recStack);

            if (result.cycle) return { cycle: true };

            subtree[child] = result.tree;
        }
    }

    recStack.delete(node);

    return { tree: subtree };
}
function calculateDepthFromRoot(root, graph) {
    if (!graph[root] || graph[root].length === 0) return 1;

    let max = 0;

    for (let child of graph[root]) {
        max = Math.max(max, calculateDepthFromRoot(child, graph));
    }

    return max + 1;
}
app.post('/bfhl', (req, res) => {
    const data = req.body.data || [];

    let valid = [];
    let invalid = [];

    data.forEach(edge => {
        if (isValidEdge(edge)) valid.push(edge.trim());
        else invalid.push(edge);
    });

    const { unique, duplicates } = processDuplicates(valid);

    const { graph, childSet } = buildGraph(unique);
    let roots = findRoots(graph, childSet);

    // 🔴 handle pure cycle case (no roots)
    if (roots.length === 0 && unique.length > 0) {
        const nodes = new Set();
        unique.forEach(e => {
            const [p, c] = e.split("->");
            nodes.add(p);
            nodes.add(c);
        });
        roots = [Array.from(nodes).sort()[0]];
    }

    const visited = new Set();
    const hierarchies = [];

    let totalTrees = 0;
    let totalCycles = 0;
    let maxDepth = 0;
    let largestRoot = "";

    for (let node of allNodes) {
    if (processed.has(node)) continue;

    let root = node;

    // if it's part of a normal tree, use actual root
    if (roots.includes(node)) {
        root = node;
    }

    const result = dfs(root, graph, new Set(), new Set());

    // mark nodes as processed
    function markVisited(n) {
        if (processed.has(n)) return;
        processed.add(n);

        if (graph[n]) {
            graph[n].forEach(child => markVisited(child));
        }
    }
    markVisited(root);

    if (result.cycle) {
    // collect nodes in this component
    const componentNodes = [];

    function collect(n) {
        if (componentNodes.includes(n)) return;
        componentNodes.push(n);

        if (graph[n]) {
            graph[n].forEach(child => collect(child));
        }
    }

    collect(root);

    // pick lexicographically smallest node
    const cycleRoot = componentNodes.sort()[0];

    hierarchies.push({
        root: cycleRoot,
        tree: {},
        has_cycle: true
    });

    totalCycles++;
} else {
        const tree = { [root]: result.tree };
        const depth = calculateDepthFromRoot(root, graph);

        hierarchies.push({
            root,
            tree,
            depth
        });

        totalTrees++;

        if (
            depth > maxDepth ||
            (depth === maxDepth && root < largestRoot)
        ) {
            maxDepth = depth;
            largestRoot = root;
        }
    }
}

    res.json({
        user_id: "mokshagna@0812",
        email_id: "lakshmi_ponduri@srmap.edu.in",
        college_roll_number: "22122005",
        hierarchies,
        invalid_entries: invalid,
        duplicate_edges: duplicates,
        summary: {
            total_trees: totalTrees,
            total_cycles: totalCycles,
            largest_tree_root: largestRoot
        }
    });
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});