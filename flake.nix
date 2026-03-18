{
  description = "Ouroboros miniprotocols in Bun";

  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    nix2container = {
      url = "github:nlewo/nix2container";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    mk-shell-bin = {
      url = "github:rrbutani/nix-mk-shell-bin";
    };

    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = with inputs; [
        devenv.flakeModule
        treefmt-nix.flakeModule
      ];
      systems = [ "x86_64-linux" ];
      perSystem = { config, self', inputs', pkgs, system, lib, ... }: {
        treefmt = {
          projectRootFile = "flake.nix";
          programs = {
            deno.enable = true;
            nixpkgs-fmt.enable = true;
          };
        };

        devenv.shells.default = {
          packages = with pkgs; [
            poppler-utils
            wasm-pack
          ];

          languages = {
            rust = {
              enable = true;
              channel = "nightly";
              version = "latest";
              components = [ "rustc" "cargo" "clippy" "rustfmt" "rust-analyzer" "miri" ];
              targets = [ "wasm32-unknown-unknown" ];
            };
            typescript = {
              enable = true;
              lsp.enable = true;
            };
            javascript = {
              enable = true;
              bun.enable = true;
              npm.enable = true;
            };
          };
        };
      };
    };
}
