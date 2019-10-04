/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 *
 * This file requires contract dependencies which are licensed as
 * GPL-3.0-or-later, forcing it to also be licensed as such.
 *
 * This is the only file in your project that requires this license and
 * you are free to choose a different license for the rest of the project.
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";

import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";

import "./AirdropDuo.sol";


contract TemplateBase is APMNamehash {
    ENS public ens;
    DAOFactory public fac;

    event DeployDao(address dao);
    event InstalledApp(address appProxy, bytes32 appId);

    constructor(DAOFactory _fac, ENS _ens) public {
        ens = _ens;

        // If no factory is passed, get it from on-chain bare-kit
        if (address(_fac) == address(0)) {
            bytes32 bareKit = apmNamehash("bare-kit");
            fac = TemplateBase(latestVersionAppBase(bareKit)).fac();
        } else {
            fac = _fac;
        }
    }

    function latestVersionAppBase(bytes32 appId) public view returns (address base) {
        Repo repo = Repo(PublicResolver(ens.resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }
}


contract SimpleTemplate is TemplateBase {
    MiniMeTokenFactory tokenFactory;

    uint64 constant PCT = 10 ** 16;
    address constant ANY_ENTITY = address(-1);

    constructor(ENS ens) TemplateBase(DAOFactory(0), ens) public {
        tokenFactory = new MiniMeTokenFactory();
    }

    function newInstance() public {
        Kernel dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());
        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        address root = msg.sender;
        bytes32 airdropAppId = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("airdrop-duo")));
        bytes32 tokenManagerAppId = apmNamehash("token-manager");

        AirdropDuo airdrop = AirdropDuo(dao.newAppInstance(airdropAppId, latestVersionAppBase(airdropAppId)));
        TokenManager token0Manager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));
        TokenManager token1Manager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));

        MiniMeToken token0 = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Token0", 18, "TOK0", false);
        token0.changeController(token0Manager);

        MiniMeToken token1 = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Token1", 18, "TOK1", true);
        token1.changeController(token1Manager);

        // Initialize apps
        token0Manager.initialize(token0, false, 0);
        token1Manager.initialize(token1, true, 0);
        airdrop.initialize(token0Manager, token1Manager);

        emit InstalledApp(token0Manager, tokenManagerAppId);
        emit InstalledApp(token1Manager, tokenManagerAppId);
        emit InstalledApp(airdrop, airdropAppId);

        acl.createPermission(this, token0Manager, token0Manager.MINT_ROLE(), this);
        acl.createPermission(airdrop, token0Manager, token0Manager.BURN_ROLE(), root);
        token0Manager.mint(root, 10e18); // Give ten tokens to root

        acl.createPermission(this, token1Manager, token1Manager.MINT_ROLE(), this);
        acl.createPermission(airdrop, token1Manager, token1Manager.BURN_ROLE(), root);
        token1Manager.mint(root, 10e18); // Give ten tokens to root

        acl.createPermission(root, airdrop, airdrop.START_ROLE(), root);

        // Clean up permissions

        acl.grantPermission(root, dao, dao.APP_MANAGER_ROLE());
        acl.revokePermission(this, dao, dao.APP_MANAGER_ROLE());
        acl.setPermissionManager(root, dao, dao.APP_MANAGER_ROLE());

        acl.grantPermission(root, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.revokePermission(this, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.setPermissionManager(root, acl, acl.CREATE_PERMISSIONS_ROLE());

        acl.revokePermission(this, token0Manager, token0Manager.MINT_ROLE());
        acl.grantPermission(airdrop, token0Manager, token0Manager.MINT_ROLE());
        acl.setPermissionManager(root, token0Manager, token0Manager.MINT_ROLE());

        acl.revokePermission(this, token1Manager, token1Manager.MINT_ROLE());
        acl.grantPermission(airdrop, token1Manager, token1Manager.MINT_ROLE());
        acl.setPermissionManager(root, token1Manager, token1Manager.MINT_ROLE());

        emit DeployDao(dao);
    }

}
