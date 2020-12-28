Workspaces are resolved directly so that there's no need to use a tool like lerna to have them linked in node_modules.
This is because we don't want to bundle them as we do for the other node_modules.
